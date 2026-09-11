// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title PlatformGovernance
/// @notice Central governance contract for platform parameters.
/// @dev Controls fee splits, exposure limits, and emergency pause.
///      All parameter changes are emitted as events for subgraph indexing.
contract PlatformGovernance {
    /* ──────────────────────────── types ───────────────────────────────── */

    struct PlatformConfig {
        uint8 lpShare;
        uint8 traderShare;
        uint8 protocolShare;
        address protocolTreasury;
        uint256 maxExposureDefault;
        uint256 minDeposit;
        uint256 maxPotsPerTrader;
        bool paused;
    }

    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;
    address public governance;

    PlatformConfig public config;

    /// @notice Addresses with operator role (can execute parameter changes).
    mapping(address => bool) public isOperator;

    /* ──────────────────────────── events ──────────────────────────────── */

    event FeeSplitSet(uint8 lp, uint8 trader, uint8 protocol);
    event TreasurySet(address indexed addr);
    event MaxExposureSet(uint256 limit);
    event MinDepositSet(uint256 amount);
    event MaxPotsPerTraderSet(uint256 limit);
    event PausedSet(bool paused);
    event OperatorSet(address indexed op, bool status);
    event OwnerSet(address indexed newOwner);
    event GovernanceSet(address indexed newGov);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyOwner();
    error OnlyGovernance();
    error OnlyOperator();
    error InvalidFeeSplit();
    error ZeroAddress();

    /* ──────────────────────────── modifiers ───────────────────────────── */

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyGov() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyOp() {
        if (!isOperator[msg.sender]) revert OnlyOperator();
        _;
    }

    /* ──────────────────────────── constructor ─────────────────────────── */

    constructor(
        address _treasury,
        uint256 _maxExposure,
        uint256 _minDeposit,
        uint256 _maxPotsPerTrader
    ) {
        owner = msg.sender;
        governance = msg.sender;
        config = PlatformConfig({
            lpShare: 80,
            traderShare: 15,
            protocolShare: 5,
            protocolTreasury: _treasury,
            maxExposureDefault: _maxExposure,
            minDeposit: _minDeposit,
            maxPotsPerTrader: _maxPotsPerTrader,
            paused: false
        });
    }

    /* ──────────────────────────── governance ──────────────────────────── */

    /// @notice Set the fee split. Must sum to 100.
    function setFeeSplit(uint8 lp, uint8 trader, uint8 protocol) external onlyGov {
        if (uint256(lp) + trader + protocol != 100) revert InvalidFeeSplit();
        config.lpShare = lp;
        config.traderShare = trader;
        config.protocolShare = protocol;
        emit FeeSplitSet(lp, trader, protocol);
    }

    function setTreasury(address addr) external onlyGov {
        if (addr == address(0)) revert ZeroAddress();
        config.protocolTreasury = addr;
        emit TreasurySet(addr);
    }

    function setMaxExposure(uint256 limit) external onlyGov {
        config.maxExposureDefault = limit;
        emit MaxExposureSet(limit);
    }

    function setMinDeposit(uint256 amount) external onlyGov {
        config.minDeposit = amount;
        emit MinDepositSet(amount);
    }

    function setMaxPotsPerTrader(uint256 limit) external onlyGov {
        config.maxPotsPerTrader = limit;
        emit MaxPotsPerTraderSet(limit);
    }

    /// @notice Emergency pause. Blocks deposits and trading on all pots.
    function setPaused(bool flag) external onlyGov {
        config.paused = flag;
        emit PausedSet(flag);
    }

    function setOperator(address op, bool status) external onlyGov {
        if (op == address(0)) revert ZeroAddress();
        isOperator[op] = status;
        emit OperatorSet(op, status);
    }

    /* ──────────────────────────── views ───────────────────────────────── */

    function getConfig() external view returns (PlatformConfig memory) {
        return config;
    }

    /// @notice Check if a deposit amount meets the minimum.
    function isDepositValid(uint256 amount) external view returns (bool) {
        return amount >= config.minDeposit;
    }

    function setOwner(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        owner = addr;
        emit OwnerSet(addr);
    }

    function setGovernance(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        governance = addr;
        emit GovernanceSet(addr);
    }
}
