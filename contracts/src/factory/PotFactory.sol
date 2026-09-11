// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {PotVault} from "../vault/PotVault.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {IOutcomeToken} from "../interfaces/IOutcomeToken.sol";
import {ISettlement} from "../interfaces/ISettlement.sol";

/// @title PotFactory
/// @notice Deploys PotVault instances and registers them on-chain.
/// @dev Each vault is a standalone ERC-20 LP token contract. Governance
///      is transferred to the platform owner immediately on creation.
///      Factory records deployments for indexing by the subgraph.
contract PotFactory {
    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;
    address public platformTreasury;

    ERC20 public immutable collateral;
    IOutcomeToken public immutable positions;
    ISettlement public immutable settlement;

    address public immutable registry;

    struct PotInfo {
        address vault;
        uint256 epochId;
        address trader;
        uint256 exposureLimit;
        uint256 createdAt;
    }

    PotInfo[] public pots;
    mapping(address => bool) public isVault;
    mapping(uint256 => address[]) public potsByEpoch;
    mapping(address => address[]) public potsByTrader;

    /* ──────────────────────────── events ──────────────────────────────── */

    event PotDeployed(
        address indexed vault,
        uint256 indexed epochId,
        address indexed trader,
        uint256 exposureLimit,
        uint256 index
    );
    event OwnerSet(address indexed newOwner);
    event TreasurySet(address indexed addr);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyOwner();
    error ZeroAddress();

    /* ──────────────────────────── modifiers ───────────────────────────── */

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /* ──────────────────────────── constructor ─────────────────────────── */

    constructor(
        ERC20 _collateral,
        IOutcomeToken _positions,
        ISettlement _settlement,
        address _registry,
        address _treasury
    ) {
        collateral = _collateral;
        positions = _positions;
        settlement = _settlement;
        registry = _registry;
        platformTreasury = _treasury;
        owner = msg.sender;
    }

    /* ──────────────────────────── functions ───────────────────────────── */

    /// @notice Deploy a new PotVault for a trader in a specific epoch.
    /// @param trader        The trader's EOA (operator key).
    /// @param epochId       The epoch this pot belongs to.
    /// @param exposureLimit Max directional risk the vault may carry.
    /// @return vault        The deployed vault address.
    function createPot(
        address trader,
        uint256 epochId,
        uint256 exposureLimit
    ) external onlyOwner returns (address vault) {
        if (trader == address(0)) revert ZeroAddress();

        PotVault v = new PotVault(
            collateral,
            positions,
            settlement,
            exposureLimit,
            platformTreasury,
            epochId,
            registry,
            address(this)
        );

        v.setOperator(trader);
        v.setGovernance(owner);

        vault = address(v);
        uint256 index = pots.length;

        pots.push(PotInfo({
            vault: vault,
            epochId: epochId,
            trader: trader,
            exposureLimit: exposureLimit,
            createdAt: block.timestamp
        }));

        isVault[vault] = true;
        potsByEpoch[epochId].push(vault);
        potsByTrader[trader].push(vault);

        emit PotDeployed(vault, epochId, trader, exposureLimit, index);
    }

    /// @notice Total number of pots deployed through this factory.
    function potCount() external view returns (uint256) {
        return pots.length;
    }

    /// @notice Get all pots for a given epoch.
    function getPotsByEpoch(uint256 epochId) external view returns (address[] memory) {
        return potsByEpoch[epochId];
    }

    /// @notice Get all pots for a given trader.
    function getPotsByTrader(address trader) external view returns (address[] memory) {
        return potsByTrader[trader];
    }

    function setOwner(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        owner = addr;
        emit OwnerSet(addr);
    }

    function setTreasury(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        platformTreasury = addr;
        emit TreasurySet(addr);
    }

    /// @notice Transfer governance of a pot deployed by this factory.
    function transferPotGovernance(address vault, address newGovernance) external onlyOwner {
        if (!isVault[vault]) revert ZeroAddress();
        PotVault(vault).setGovernance(newGovernance);
    }
}
