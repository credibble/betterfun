// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "solmate/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "solmate/utils/ReentrancyGuard.sol";
import {IDreamDEXPool} from "../interfaces/IDreamDEXPool.sol";
import {IOutcomeToken} from "../interfaces/IOutcomeToken.sol";
import {ISettlement} from "../interfaces/ISettlement.sol";

/// @title PotVault
/// @notice Per-pot ERC-20 LP vault that trades on DreamDEX binary event contracts.
///
/// @dev LPs deposit collateral, receive vault shares. An operator (the trader)
///      quotes both sides of binary BTC/ETH windows on the vault's behalf.
///      The vault is the on-chain trading account — it mints complete sets,
///      holds outcome tokens, and places orders. The operator never holds funds.
///
///  Architecture:
///   - Epoch-gated deposits: funding only during the pot's epoch funding window
///   - Profit-split on settlement: LP 80% / trader 15% / protocol 5%
///   - Pool allowlist: operator may only touch governance-approved pools
///   - NAV = idle collateral + min(YES, NO) across all pool positions
///   - Share price = NAV / totalSupply
///
///  The vault reads live outcome ids from each pool on every positionTotals()
///  call rather than caching them — pools recycle nonce→id bindings across
///  windows, so any id captured at allowlist time goes stale within minutes.
contract PotVault is ERC20, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    /* ──────────────────────────── immutables ──────────────────────────── */

    ERC20 public immutable collateral;
    IOutcomeToken public immutable positions;
    ISettlement public immutable settlement;

    /// @dev Scales raw collateral (6dp on testnet) to 18dp share math.
    uint256 public immutable scale;

    /// @dev One whole unit of collateral (1e6 on testnet, 1e18 on mainnet).
    uint256 public immutable one;

    /* ──────────────────────────── storage ─────────────────────────────── */

    address public governance;
    address public operator;
    bool public halted;

    uint256 public immutable epochId;
    address public immutable registry;
    address public immutable factory;

    /// @notice Maximum number of pools the operator may track.
    uint8 public constant MAX_POOLS = 32;

    /// @notice Max imbalance the operator may accumulate (raw collateral units).
    uint256 public exposureLimit;

    /// @notice Fee split numerator constants. Total = 100.
    uint8 public constant LP_SHARE = 80;
    uint8 public constant TRADER_SHARE = 15;
    uint8 public constant PROTOCOL_SHARE = 5;

    /// @notice Protocol fee receiver.
    address public protocolTreasury;

    /// @notice Pool allowlist.
    mapping(address => bool) public approved;
    address[] public roster;
    mapping(address => bool) private _seen;

    /// @notice Accumulated protocol fees pending withdrawal.
    uint256 public protocolFees;

    /// @notice Accumulated trader fees pending withdrawal.
    uint256 public traderFees;

    /// @notice Total deposits received (for indexing).
    uint256 public totalDeposits;

    /// @notice Total withdrawals processed (for indexing).
    uint256 public totalWithdrawals;

    /* ──────────────────────────── events ──────────────────────────────── */

    event Deposit(address indexed lp, uint256 collateralIn, uint256 sharesOut);
    event Withdraw(address indexed lp, uint256 sharesBurned, uint256 collateralOut);
    event SetMinted(address indexed pool, uint256 amount);
    event SetBurned(address indexed pool, uint256 amount);
    event OrderPlaced(address indexed pool, uint8 side, uint256 tick, uint256 size, uint256 orderId);
    event OrderCancelled(address indexed pool, uint256 orderId);
    event Redeemed(uint256 outcomeId, uint256 amount, uint256 collateralOut);
    event FeesWithdrawn(address indexed to, uint256 amount, bool isProtocol);
    event PoolApproved(address indexed pool);
    event PoolRevoked(address indexed pool);
    event GovernanceSet(address indexed newGov);
    event OperatorSet(address indexed newOps);
    event HaltedSet(bool halted);
    event ExposureLimitSet(uint256 limit);
    event TreasurySet(address indexed addr);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyGovernance();
    error OnlyOperator();
    error OnlyRegistry();
    error VaultHalted();
    error PoolNotApproved();
    error BadSide();
    error ZeroAmount();
    error ExposureBreached(uint256 wouldBe, uint256 limit);
    error NothingToClaim();
    error NoRosterSpace();
    error ZeroAddress();

    /* ──────────────────────────── modifiers ───────────────────────────── */

    modifier onlyGov() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyOps() {
        if (msg.sender != operator) revert OnlyOperator();
        if (halted) revert VaultHalted();
        _;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) revert OnlyRegistry();
        _;
    }

    /// @dev After every operator action, verify directional exposure limit.
    modifier withinExposure() {
        _;
        uint256 exp = exposure();
        if (exp > exposureLimit) revert ExposureBreached(exp, exposureLimit);
    }

    /* ──────────────────────────── constructor ─────────────────────────── */

    constructor(
        ERC20 _collateral,
        IOutcomeToken _positions,
        ISettlement _settlement,
        uint256 _exposureLimit,
        address _treasury,
        uint256 _epochId,
        address _registry,
        address _factory
    ) ERC20("Pot Vault LP", "potLP", 18) {
        collateral = _collateral;
        positions = _positions;
        settlement = _settlement;
        governance = msg.sender;
        exposureLimit = _exposureLimit;
        protocolTreasury = _treasury;
        epochId = _epochId;
        registry = _registry;
        factory = _factory;

        uint8 d = _collateral.decimals();
        require(d <= 18, "decimals overflow");
        scale = 10 ** (18 - d);
        one = 10 ** d;
    }

    /* ──────────────────────────── views ───────────────────────────────── */

    /// @notice Net asset value in raw collateral units.
    function nav() public view returns (uint256 idle) {
        idle = collateral.balanceOf(address(this));
        (uint256 yes, uint256 no) = positionTotals();
        idle += yes < no ? yes : no;
    }

    /// @notice Collateral per share, scaled to 18dp.
    function pricePerShare() public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return 1e18;
        return (nav() * scale * 1e18) / supply;
    }

    /// @notice Directional exposure across all pools.
    function exposure() public view returns (uint256) {
        (uint256 yes, uint256 no) = positionTotals();
        return yes > no ? yes - no : no - yes;
    }

    /// @notice Number of pools in the active roster.
    function rosterLength() external view returns (uint256) {
        return roster.length;
    }

    /* ──────────────────────────── position accounting ─────────────────── */

    /// @notice Walk the roster and sum YES and NO balances across all pools.
    function positionTotals() public view returns (uint256 yes, uint256 no) {
        uint256 n = roster.length;
        for (uint256 i; i < n; ++i) {
            address pool = roster[i];

            (bool ok, bytes memory raw) = pool.staticcall{gas: 150_000}(
                abi.encodeWithSelector(IDreamDEXPool.params.selector)
            );
            if (!ok || raw.length < 480) continue;

            IDreamDEXPool.PoolState memory st = abi.decode(raw, (IDreamDEXPool.PoolState));
            yes += _readBalance(st.yesId);
            no += _readBalance(st.noId);
        }
    }

    /// @dev Capped read of one outcome balance. Silently returns 0 on failure.
    function _readBalance(uint256 tokenId) internal view returns (uint256) {
        (bool ok, bytes memory raw) = address(positions).staticcall{gas: 100_000}(
            abi.encodeWithSelector(IOutcomeToken.balanceOf.selector, address(this), tokenId)
        );
        if (!ok || raw.length < 32) return 0;
        return abi.decode(raw, (uint256));
    }

    /* ──────────────────────────── LP functions ────────────────────────── */

    /// @notice Deposit collateral, receive vault shares.
    function enter(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (halted) revert VaultHalted();
        if (amount == 0) revert ZeroAmount();

        uint256 supply = totalSupply;
        uint256 navBefore = nav();

        shares = supply == 0 ? amount * scale : (amount * supply) / navBefore;
        if (shares == 0) revert ZeroAmount();

        collateral.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, shares);

        totalDeposits += amount;
        emit Deposit(msg.sender, amount, shares);
    }

    /// @notice Burn shares, receive collateral. Only from idle balance.
    /// @dev NOT halted-gated — depositors must always be able to exit.
    function exit(uint256 shares) external nonReentrant returns (uint256 collateralOut) {
        if (shares == 0) revert ZeroAmount();

        uint256 supply = totalSupply;
        collateralOut = (shares * nav()) / supply;
        if (collateralOut == 0) revert ZeroAmount();

        _burn(msg.sender, shares);
        collateral.safeTransfer(msg.sender, collateralOut);

        totalWithdrawals += collateralOut;
        emit Withdraw(msg.sender, shares, collateralOut);
    }

    /* ──────────────────────────── operator: set management ────────────── */

    /// @notice Mint a complete YES+NO set into the vault.
    function mintSet(address pool, uint256 amount) external onlyOps withinExposure {
        if (!approved[pool]) revert PoolNotApproved();
        if (amount == 0) revert ZeroAmount();

        collateral.safeApprove(pool, 0);
        collateral.safeApprove(pool, amount);
        IDreamDEXPool(pool).mintSet(address(this), address(this), amount);
        collateral.safeApprove(pool, 0);

        emit SetMinted(pool, amount);
    }

    /// @notice Burn matched pairs back to collateral.
    function burnSet(address pool, uint256 amount) external onlyOps withinExposure {
        if (!approved[pool]) revert PoolNotApproved();
        if (amount == 0) revert ZeroAmount();

        // Grant pool operator permission to burn outcome tokens from this vault
        (bool ok, bytes memory raw) = address(positions).staticcall{gas: 100_000}(
            abi.encodeWithSelector(IOutcomeToken.isOperator.selector, address(this), pool)
        );
        if (!ok || raw.length < 32 || !abi.decode(raw, (bool))) {
            (ok, raw) = address(positions).call{gas: 100_000}(
                abi.encodeWithSelector(IOutcomeToken.setOperator.selector, pool, true)
            );
        }

        IDreamDEXPool(pool).burnSet(amount);
        emit SetBurned(pool, amount);
    }

    /* ──────────────────────────── operator: order routing ─────────────── */

    /// @notice Place an IOC order on an approved pool.
    /// @param side 0=BUY_YES 1=SELL_YES 2=BUY_NO 3=SELL_NO
    function trade(
        address pool,
        uint8 side,
        uint256 tick,
        uint256 size,
        uint64 expiryNs,
        uint8 orderKind,
        uint8 selfMatch
    ) external onlyOps withinExposure returns (uint256 orderId) {
        if (!approved[pool]) revert PoolNotApproved();
        if (side > 3) revert BadSide();

        bool isBuy = side == 0 || side == 2;
        if (isBuy) {
            uint256 escrow = (tick * size) / one;
            collateral.safeApprove(pool, 0);
            collateral.safeApprove(pool, escrow);
        }

        uint256 worstCase = exposure() + size;
        if (worstCase > exposureLimit) revert ExposureBreached(worstCase, exposureLimit);

        (bool success, uint128 id) = IDreamDEXPool(pool).placeBinaryOrder{value: 0}(
            side, tick, size, expiryNs, orderKind, selfMatch,
            address(0), 0, 0
        );
        orderId = id;

        if (isBuy) collateral.safeApprove(pool, 0);

        emit OrderPlaced(pool, side, tick, size, orderId);
    }

    function cancelOrder(address pool, uint128 orderId) external onlyOps {
        if (!approved[pool]) revert PoolNotApproved();
        IDreamDEXPool(pool).cancelOrder(orderId);
        emit OrderCancelled(pool, orderId);
    }

    function cancelOrders(address pool, uint128[] calldata ids) external onlyOps {
        if (!approved[pool]) revert PoolNotApproved();
        IDreamDEXPool(pool).cancelExpiredOrders(ids);
        for (uint256 i; i < ids.length; ++i) {
            emit OrderCancelled(pool, ids[i]);
        }
    }

    /* ──────────────────────────── settlement ──────────────────────────── */

    /// @notice Redeem a settled position. Permissionless — anyone may call.
    function redeem(uint256 outcomeId, uint256 amount)
        external
        nonReentrant
        returns (uint256 collateralOut)
    {
        if (amount == 0) revert ZeroAmount();

        collateralOut = settlement.redeem(outcomeId, amount, address(this));
        if (collateralOut == 0) revert NothingToClaim();

        _splitFees(collateralOut);
        emit Redeemed(outcomeId, amount, collateralOut);
    }

    /// @notice Finalize + redeem in one tx if the market is not yet settled.
    function redeemFinalize(address pool, uint256 outcomeId, uint256 amount)
        external
        nonReentrant
        returns (uint256 collateralOut)
    {
        if (amount == 0) revert ZeroAmount();

        collateralOut = settlement.finalizeAndRedeem(pool, outcomeId, amount, address(this));
        if (collateralOut == 0) revert NothingToClaim();

        _splitFees(collateralOut);
        emit Redeemed(outcomeId, amount, collateralOut);
    }

    /// @dev Split settlement proceeds: LP pool gets the bulk.
    function _splitFees(uint256 total) internal {
        uint256 traderCut = (total * TRADER_SHARE) / 100;
        uint256 protoCut = (total * PROTOCOL_SHARE) / 100;
        traderFees += traderCut;
        protocolFees += protoCut;
    }

    /* ──────────────────────────── fee withdrawal ──────────────────────── */

    /// @notice Trader claims accumulated trading fees.
    function claimTraderFees() external onlyOps {
        uint256 amount = traderFees;
        if (amount == 0) revert NothingToClaim();
        traderFees = 0;
        collateral.safeTransfer(operator, amount);
        emit FeesWithdrawn(operator, amount, false);
    }

    /// @notice Governance claims accumulated protocol fees.
    function claimProtocolFees() external onlyGov {
        uint256 amount = protocolFees;
        if (amount == 0) revert NothingToClaim();
        protocolFees = 0;
        collateral.safeTransfer(protocolTreasury, amount);
        emit FeesWithdrawn(protocolTreasury, amount, true);
    }

    /* ──────────────────────────── governance ──────────────────────────── */

    function approvePool(address pool) external onlyGov {
        if (!_seen[pool]) {
            if (roster.length >= MAX_POOLS) revert NoRosterSpace();
            roster.push(pool);
            _seen[pool] = true;
        }
        approved[pool] = true;
        try positions.setOperator(pool, true) {} catch {}
        emit PoolApproved(pool);
    }

    function revokePool(address pool) external onlyGov {
        approved[pool] = false;
        try positions.setOperator(pool, false) {} catch {}
        emit PoolRevoked(pool);
    }

    function setGovernance(address addr) external onlyGov {
        if (addr == address(0)) revert ZeroAddress();
        governance = addr;
        emit GovernanceSet(addr);
    }

    function setOperator(address addr) external onlyGov {
        if (addr == address(0)) revert ZeroAddress();
        operator = addr;
        emit OperatorSet(addr);
    }

    function setHalted(bool flag) external onlyGov {
        halted = flag;
        emit HaltedSet(flag);
    }

    function setExposureLimit(uint256 limit) external onlyGov {
        exposureLimit = limit;
        emit ExposureLimitSet(limit);
    }

    function setTreasury(address addr) external onlyGov {
        if (addr == address(0)) revert ZeroAddress();
        protocolTreasury = addr;
        emit TreasurySet(addr);
    }
}
