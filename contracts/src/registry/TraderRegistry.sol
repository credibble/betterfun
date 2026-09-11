// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "solmate/utils/ReentrancyGuard.sol";

/// @title TraderRegistry
/// @notice On-chain registry for trader profiles and social relationships.
/// @dev Stores IPFS CIDs for metadata, tracks follows, and manages
///      verification status. All profile data (name, bio, avatar) lives
///      on IPFS; only the CID and key flags are on-chain.
contract TraderRegistry is ReentrancyGuard {
    /* ──────────────────────────── types ───────────────────────────────── */

    enum TraderType { Human, AI }

    struct TraderProfile {
        bytes32 metadataCID;      // IPFS hash for name, bio, avatar, etc.
        address payoutAddress;    // Where trading fees are sent
        TraderType traderType;
        bool verified;
        bool active;
        uint256 registeredAt;
        uint256 potCount;
        uint256 totalAUM;         // Sum of all pot NAVs
    }

    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;
    address public governance;

    mapping(address => TraderProfile) public traders;
    address[] public traderList;

    /// @notice Total registered traders.
    uint256 public traderCount;

    /* ──────────────────────────── events ──────────────────────────────── */

    event TraderRegistered(
        address indexed trader,
        bytes32 metadataCID,
        address payoutAddress,
        TraderType traderType
    );
    event TraderUpdated(address indexed trader, bytes32 metadataCID);
    event TraderVerified(address indexed trader, bool verified);
    event TraderDeactivated(address indexed trader);
    event OwnerSet(address indexed newOwner);
    event GovernanceSet(address indexed newGov);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyOwner();
    error OnlyGovernance();
    error AlreadyRegistered();
    error NotRegistered();
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

    /* ──────────────────────────── constructor ─────────────────────────── */

    constructor(address _owner) {
        owner = _owner;
        governance = _owner;
    }

    /* ──────────────────────────── registration ────────────────────────── */

    /// @notice Register as a trader. Caller becomes the trader.
    function registerTrader(
        bytes32 metadataCID,
        address payoutAddress,
        TraderType traderType
    ) external {
        if (traders[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        if (payoutAddress == address(0)) revert ZeroAddress();

        traders[msg.sender] = TraderProfile({
            metadataCID: metadataCID,
            payoutAddress: payoutAddress,
            traderType: traderType,
            verified: false,
            active: true,
            registeredAt: block.timestamp,
            potCount: 0,
            totalAUM: 0
        });

        traderList.push(msg.sender);
        traderCount++;

        emit TraderRegistered(msg.sender, metadataCID, payoutAddress, traderType);
    }

    /// @notice Update your metadata CID.
    function updateMetadata(bytes32 metadataCID) external {
        if (traders[msg.sender].registeredAt == 0) revert NotRegistered();
        traders[msg.sender].metadataCID = metadataCID;
        emit TraderUpdated(msg.sender, metadataCID);
    }

    /// @notice Update your payout address.
    function updatePayoutAddress(address addr) external {
        if (traders[msg.sender].registeredAt == 0) revert NotRegistered();
        if (addr == address(0)) revert ZeroAddress();
        traders[msg.sender].payoutAddress = addr;
    }

    /* ──────────────────────────── governance ──────────────────────────── */

    /// @notice Verify or unverify a trader.
    function setVerified(address trader, bool verified) external onlyGov {
        if (traders[trader].registeredAt == 0) revert NotRegistered();
        traders[trader].verified = verified;
        emit TraderVerified(trader, verified);
    }

    /// @notice Deactivate a trader (governance action).
    function deactivate(address trader) external onlyGov {
        if (traders[trader].registeredAt == 0) revert NotRegistered();
        traders[trader].active = false;
        emit TraderDeactivated(trader);
    }

    /// @notice Increment a trader's pot count (called by PotFactory).
    function incrementPotCount(address trader) external {
        if (traders[trader].registeredAt == 0) revert NotRegistered();
        traders[trader].potCount++;
    }

    /// @notice Update a trader's AUM (called by subgraph sync or governance).
    function updateAUM(address trader, uint256 aum) external {
        if (traders[trader].registeredAt == 0) revert NotRegistered();
        traders[trader].totalAUM = aum;
    }

    /* ──────────────────────────── views ───────────────────────────────── */

    /// @notice Get a trader's full profile.
    function getTrader(address trader) external view returns (TraderProfile memory) {
        return traders[trader];
    }

    /// @notice Get all registered traders.
    function getAllTraders() external view returns (address[] memory) {
        return traderList;
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
