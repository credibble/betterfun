// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IBinaryModule
/// @notice Interface for DreamDEX BinaryMarketsModule.
/// @dev Testnet: 0x3ecC694Cef705358864a646142ac17A90E29e388
interface IBinaryModule {
    function settlement() external view returns (address);
    function poolCreator(address pool) external view returns (address creator);
    function getFreePools(address creator, address collateral) external view returns (address[] memory pools);
    function freePoolCount(address creator, address collateral) external view returns (uint256 count);
    function marketNonce(bytes32 marketId) external view returns (uint64 nonce);
    function markets(bytes32 marketId) external view returns (
        uint256 oracleQuestionId,
        uint8 outcomeSlotCount,
        uint8 voidPolicy,
        address collateral,
        uint32 originOperatorId,
        bytes32 originVenueId,
        address oracleAdapter,
        address creator,
        address market,
        address pool,
        uint256 yesId,
        uint256 noId,
        uint64 tradingStart,
        uint64 expiry
    );
    function redeem(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint8 outcomeIdx, uint256 amount) external;
    function redeemMany(uint32 operatorId, bytes32 venueId, bytes32[] calldata marketIds, uint8[] calldata outcomeIdxs, uint256[] calldata amounts) external;
    function mintCompleteSet(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint256 amount) external;
    function mergeCompleteSet(uint32 operatorId, bytes32 venueId, bytes32 marketId, uint256 amount) external;
    function finalizeMarket(bytes32 marketId) external;
}
