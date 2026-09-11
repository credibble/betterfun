// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IDreamDEXPool
/// @notice Minimal interface for DreamDEX binary event pools.
/// @dev Derived from on-chain inspection of deployed Somnia testnet pools.
interface IDreamDEXPool {
    struct PoolState {
        address collateral;
        address eventMarket;
        address outcomeNft;
        uint256 yesId;
        uint256 noId;
        uint256 oneCollateral;
        uint256 setBacking;
        address feeCollector;
        uint256 makerFeeX1k;
        uint256 takerFeeX1k;
        uint256 maxBuilderFeeX1k;
        uint256 settleFeeX1k;
        address settleSingleton;
        uint64 epochNonce;
        bool frozen;
    }

    function params() external view returns (PoolState memory);
    function mintSet(address owner, address recipient, uint256 amount) external;
    function burnSet(uint256 amount) external;
    function placeBinaryOrder(
        uint8 kind,
        uint256 price,
        uint256 quantity,
        uint64 expireTimestampNs,
        uint8 orderType,
        uint8 selfMatchingOption,
        address builder,
        uint96 builderFeeBpsTimes1k,
        uint64 userData
    ) external payable returns (bool success, uint128 id);
    function cancelOrder(uint128 orderId) external;
    function cancelExpiredOrders(uint128[] calldata orderIds) external;
}
