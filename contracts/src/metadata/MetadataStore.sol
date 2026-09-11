// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title MetadataStore
/// @notice Generic IPFS CID storage for all on-chain entities.
/// @dev Provides version-controlled metadata for traders, pots, and epochs.
///      All rich data (images, descriptions, strategies) lives on IPFS;
///      this contract only stores the content hashes.
contract MetadataStore {
    /* ──────────────────────────── types ───────────────────────────────── */

    enum EntityType { Trader, Pot, Epoch }

    struct MetadataEntry {
        bytes32 currentCID;
        bytes32 previousCID;
        uint256 updatedAt;
        uint256 version;
    }

    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;

    /// @notice entity type → entity address/id → metadata
    mapping(EntityType => mapping(bytes32 => MetadataEntry)) public metadata;

    /// @notice entity type → entity address/id → version history
    mapping(EntityType => mapping(bytes32 => bytes32[])) public history;

    /* ──────────────────────────── events ──────────────────────────────── */

    event MetadataSet(
        EntityType indexed entityType,
        bytes32 indexed entityKey,
        bytes32 cid,
        uint256 version
    );
    event OwnerSet(address indexed newOwner);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyOwner();
    error ZeroCID();
    error ZeroAddress();

    /* ──────────────────────────── modifiers ───────────────────────────── */

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /* ──────────────────────────── constructor ─────────────────────────── */

    constructor(address _owner) {
        owner = _owner;
    }

    /* ──────────────────────────── functions ───────────────────────────── */

    /// @notice Set or update metadata for an entity.
    /// @param entityType  The type of entity (Trader, Pot, Epoch).
    /// @param entityKey   The entity's address or unique key.
    /// @param cid         The IPFS content identifier.
    function setMetadata(
        EntityType entityType,
        bytes32 entityKey,
        bytes32 cid
    ) external {
        if (cid == bytes32(0)) revert ZeroCID();

        MetadataEntry storage entry = metadata[entityType][entityKey];
        entry.previousCID = entry.currentCID;
        entry.currentCID = cid;
        entry.updatedAt = block.timestamp;
        entry.version++;

        history[entityType][entityKey].push(cid);

        emit MetadataSet(entityType, entityKey, cid, entry.version);
    }

    /* ──────────────────────────── views ───────────────────────────────── */

    /// @notice Get current metadata for an entity.
    function getMetadata(EntityType entityType, bytes32 entityKey)
        external
        view
        returns (MetadataEntry memory)
    {
        return metadata[entityType][entityKey];
    }

    /// @notice Get the current CID for an entity.
    function getCurrentCID(EntityType entityType, bytes32 entityKey)
        external
        view
        returns (bytes32)
    {
        return metadata[entityType][entityKey].currentCID;
    }

    /// @notice Get the previous CID for an entity.
    function getPreviousCID(EntityType entityType, bytes32 entityKey)
        external
        view
        returns (bytes32)
    {
        return metadata[entityType][entityKey].previousCID;
    }

    /// @notice Get the full CID history for an entity.
    function getHistory(EntityType entityType, bytes32 entityKey)
        external
        view
        returns (bytes32[] memory)
    {
        return history[entityType][entityKey];
    }

    /// @notice Get the version count for an entity.
    function getVersionCount(EntityType entityType, bytes32 entityKey)
        external
        view
        returns (uint256)
    {
        return history[entityType][entityKey].length;
    }

    function setOwner(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        owner = addr;
        emit OwnerSet(addr);
    }
}
