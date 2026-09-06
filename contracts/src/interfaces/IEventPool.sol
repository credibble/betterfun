// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IEventPool
/// @notice Minimal interface for DreamDEX binary event pools.
/// @dev Derived from on-chain inspection of deployed Somnia testnet pools.
///      Function selectors match the deployed bytecode.
interface IEventPool {
    /// @notice Live pool parameters including current outcome token ids.
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

    /// @notice Read the pool's live parameters. Must not be cached.
    function params() external view returns (PoolState memory);

    /// @notice Mint a complete YES+NO set for `amount` collateral.
    function mintSet(address recipient, uint256 amount) external;

    /// @notice Burn `amount` of each leg from caller, return collateral.
    function burnSet(uint256 amount) external;

    /// @notice Submit an IOC order.
    /// @param side 0=BUY_YES 1=SELL_YES 2=BUY_NO 3=SELL_NO
    function submitOrder(
        uint8 side,
        uint256 tick,
        uint256 size,
        uint64 expiryNs,
        uint8 orderKind,
        uint8 selfMatch,
        address builder,
        uint96 builderBpsX1k,
        uint64 tag
    ) external returns (uint256 orderId);

    function cancelSingle(uint128 orderId) external;
    function cancelBatch(uint128[] calldata ids) external;
}
