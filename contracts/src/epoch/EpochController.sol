// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title EpochController
/// @notice Manages epoch lifecycle as an on-chain state machine.
/// @dev Epochs are fixed-cadence time boxes:
///      Upcoming → Live (funding open) → Settling (trading locked) → Settled
///
///  Transitions are time-gated (must wait for period to elapse) and
///  can be triggered by anyone (callable by design — keepers).
contract EpochController {
    /* ──────────────────────────── types ───────────────────────────────── */

    enum EpochStatus { Upcoming, Live, Settling, Settled }

    struct Epoch {
        uint256 number;
        uint256 startsAt;        // When funding opens (Live)
        uint256 tradingEndsAt;   // When trading locks (Settling)
        uint256 endsAt;          // When settlement begins (Settled)
        EpochStatus status;
        uint256 potCount;
        uint256 tvl;
    }

    /* ──────────────────────────── storage ─────────────────────────────── */

    address public owner;
    address public governance;

    Epoch[] public epochs;
    uint256 public currentEpochId;

    /// @notice Duration of each phase in seconds.
    uint256 public fundingDuration;    // Live phase: deposits open
    uint256 public tradingDuration;    // Settling phase: trading locked

    /// @notice Minimum time between epochs (buffer for settlement).
    uint256 public epochBuffer;

    /* ──────────────────────────── events ──────────────────────────────── */

    event EpochCreated(uint256 indexed epochId, uint256 startsAt, uint256 endsAt);
    event EpochWentLive(uint256 indexed epochId);
    event EpochWentSettling(uint256 indexed epochId);
    event EpochSettled(uint256 indexed epochId);
    event PotAddedToEpoch(uint256 indexed epochId, address indexed pot);
    event ParamsSet(uint256 fundingDuration, uint256 tradingDuration, uint256 epochBuffer);
    event OwnerSet(address indexed newOwner);
    event GovernanceSet(address indexed newGov);

    /* ──────────────────────────── errors ──────────────────────────────── */

    error OnlyOwner();
    error OnlyGovernance();
    error InvalidTime();
    error EpochNotLive();
    error EpochNotSettling();
    error EpochNotUpcoming();
    error TooEarly();
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

    constructor(
        uint256 _fundingDuration,
        uint256 _tradingDuration,
        uint256 _epochBuffer
    ) {
        owner = msg.sender;
        governance = msg.sender;
        fundingDuration = _fundingDuration;
        tradingDuration = _tradingDuration;
        epochBuffer = _epochBuffer;
    }

    /* ──────────────────────────── epoch lifecycle ─────────────────────── */

    /// @notice Create a new epoch. Automatically chains after the previous one.
    ///      If the previous epoch is Live and past its tradingEndsAt, it is
    ///      force-settled (Live → Settling) before the new epoch is created.
    /// @param startsAt When this epoch's funding opens. Pass 0 to auto-schedule.
    /// @return epochId The new epoch's ID.
    function createEpoch(uint256 startsAt) external returns (uint256 epochId) {
        uint256 num = epochs.length;

        // Force-settle previous epoch if it's Live and past trading end
        if (num > 0) {
            Epoch storage prev = epochs[num - 1];
            if (prev.status == EpochStatus.Live && block.timestamp >= prev.tradingEndsAt) {
                prev.status = EpochStatus.Settling;
                emit EpochWentSettling(num - 1);
            }
        }

        if (startsAt == 0) {
            if (num == 0) {
                startsAt = block.timestamp;
            } else {
                Epoch storage prev = epochs[num - 1];
                startsAt = prev.endsAt + epochBuffer;
            }
        }

        uint256 tradingEnd = startsAt + fundingDuration;
        uint256 endsAt = tradingEnd + tradingDuration;

        require(endsAt > block.timestamp, "Epoch must end in the future");

        epochs.push(Epoch({
            number: num,
            startsAt: startsAt,
            tradingEndsAt: tradingEnd,
            endsAt: endsAt,
            status: EpochStatus.Upcoming,
            potCount: 0,
            tvl: 0
        }));

        currentEpochId = num;
        emit EpochCreated(num, startsAt, endsAt);
        return num;
    }

    /// @notice Transition Upcoming → Live. Opens funding. Anyone can call after startsAt.
    function goLive(uint256 epochId) external {
        Epoch storage ep = epochs[epochId];
        if (ep.status != EpochStatus.Upcoming) revert EpochNotLive();
        if (block.timestamp < ep.startsAt) revert TooEarly();

        ep.status = EpochStatus.Live;
        emit EpochWentLive(epochId);
    }

    /// @notice Transition Live → Settling. Locks trading. Anyone can call after tradingEndsAt.
    function goSettling(uint256 epochId) external {
        Epoch storage ep = epochs[epochId];
        if (ep.status != EpochStatus.Live) revert EpochNotSettling();
        if (block.timestamp < ep.tradingEndsAt) revert TooEarly();

        ep.status = EpochStatus.Settling;
        emit EpochWentSettling(epochId);
    }

    /// @notice Transition Settling → Settled. Anyone can call after endsAt.
    function goSettled(uint256 epochId) external {
        Epoch storage ep = epochs[epochId];
        if (ep.status != EpochStatus.Settling) revert EpochNotSettling();
        if (block.timestamp < ep.endsAt) revert TooEarly();

        ep.status = EpochStatus.Settled;
        emit EpochSettled(epochId);
    }

    /* ──────────────────────────── pot tracking ────────────────────────── */

    /// @notice Record a pot creation against an epoch. Called by PotFactory.
    function addPot(uint256 epochId) external {
        Epoch storage ep = epochs[epochId];
        ep.potCount++;
    }

    /// @notice Update epoch TVL. Called by subgraph sync or governance.
    function updateTVL(uint256 epochId, uint256 tvl) external {
        epochs[epochId].tvl = tvl;
    }

    /* ──────────────────────────── views ───────────────────────────────── */

    function getEpoch(uint256 epochId) external view returns (Epoch memory) {
        return epochs[epochId];
    }

    function epochCount() external view returns (uint256) {
        return epochs.length;
    }

    /// @notice Is funding currently open for this epoch?
    function isFundingOpen(uint256 epochId) external view returns (bool) {
        Epoch storage ep = epochs[epochId];
        return ep.status == EpochStatus.Live;
    }

    /// @notice Is trading currently open for this epoch? (Live status = deposits + trading)
    function isTradingOpen(uint256 epochId) external view returns (bool) {
        Epoch storage ep = epochs[epochId];
        return ep.status == EpochStatus.Live && block.timestamp < ep.tradingEndsAt;
    }

    /// @notice Is settlement period for this epoch?
    function isSettling(uint256 epochId) external view returns (bool) {
        return epochs[epochId].status == EpochStatus.Settling;
    }

    /// @notice Get the latest epoch.
    function latestEpoch() external view returns (uint256) {
        return epochs.length - 1;
    }

    /* ──────────────────────────── governance ──────────────────────────── */

    function setParams(
        uint256 _fundingDuration,
        uint256 _tradingDuration,
        uint256 _epochBuffer
    ) external onlyGov {
        fundingDuration = _fundingDuration;
        tradingDuration = _tradingDuration;
        epochBuffer = _epochBuffer;
        emit ParamsSet(_fundingDuration, _tradingDuration, _epochBuffer);
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
