// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IBinarySettlement
/// @notice DreamDEX settlement singleton for redeeming settled positions.
/// @dev Testnet address: 0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23
interface IBinarySettlement {
    /// @notice Burn settled outcome tokens, receive collateral.
    function redeem(
        uint256 outcomeId,
        uint256 amount,
        address to
    ) external returns (uint256 collateralOut);

    /// @notice Finalize market (if needed) then redeem in one call.
    function finalizeAndRedeem(
        address pool,
        uint256 outcomeId,
        uint256 amount,
        address to
    ) external returns (uint256 collateralOut);
}
