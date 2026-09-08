// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EventVault} from "../vault/EventVault.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {IOutcomeNft} from "../interfaces/IOutcomeNft.sol";
import {ISettlement} from "../interfaces/ISettlement.sol";

/// @title VaultFactory
/// @notice Deploys per-epoch EventVault instances for the BetterFun platform.
/// @dev Each vault is a standalone ERC-20 LP token contract. The factory
///      records deployments for indexing but does not hold admin rights
///      over them — governance is transferred to the platform multisig
///      immediately on creation.
contract VaultFactory {
    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;
    address public platformTreasury;

    ERC20 public immutable collateral;
    IOutcomeNft public immutable positions;
    ISettlement public immutable settlement;

    struct VaultInfo {
        address vault;
        address trader;
        uint256 exposureLimit;
        uint256 createdAt;
    }

    VaultInfo[] public vaults;
    mapping(address => bool) public isVault;

    /* ──────────────────────────── events ──────────────────────────────── */

    event VaultDeployed(
        address indexed vault,
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
        IOutcomeNft _positions,
        ISettlement _settlement,
        address _treasury
    ) {
        collateral = _collateral;
        positions = _positions;
        settlement = _settlement;
        platformTreasury = _treasury;
        owner = msg.sender;
    }

    /* ──────────────────────────── functions ───────────────────────────── */

    /// @notice Deploy a new EventVault for a trader.
    /// @param trader        The trader's EOA (operator key).
    /// @param exposureLimit Max directional risk the vault may carry.
    /// @return vault        The deployed vault address.
    function deploy(address trader, uint256 exposureLimit)
        external
        onlyOwner
        returns (address vault)
    {
        if (trader == address(0)) revert ZeroAddress();

        EventVault v = new EventVault(
            collateral,
            positions,
            settlement,
            exposureLimit,
            platformTreasury
        );

        // Grant operator role to the trader.
        v.setOperator(trader);

        // Transfer governance from factory → platform owner so that
        // approvePool, setHalted, etc. can be called by the platform EOA.
        v.setGovernance(owner);

        vault = address(v);
        vaults.push(VaultInfo({
            vault: vault,
            trader: trader,
            exposureLimit: exposureLimit,
            createdAt: block.timestamp
        }));
        isVault[vault] = true;

        emit VaultDeployed(vault, trader, exposureLimit, vaults.length - 1);
    }

    /// @notice Total number of vaults deployed through this factory.
    function vaultCount() external view returns (uint256) {
        return vaults.length;
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

    /// @notice Transfer governance of a vault deployed by this factory.
    /// @dev    Allows the platform to move governance from the factory to a
    ///         multisig / EOA that can then call approvePool, setHalted, etc.
    function transferVaultGovernance(address vault, address newGovernance)
        external
        onlyOwner
    {
        if (!isVault[vault]) revert ZeroAddress();
        EventVault(vault).setGovernance(newGovernance);
    }
}
