// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISettlement
/// @notice DreamDEX settlement singleton for redeeming settled positions.
/// @dev Testnet: 0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23
interface ISettlement {
    function redeem(uint256 outcomeId, uint256 amount, address to) external returns (uint256 collateralOut);
    function finalizeAndRedeem(address pool, uint256 outcomeId, uint256 amount, address to) external returns (uint256 collateralOut);
    function finalize(address pool) external returns (uint256 marketKey);
    function isFinalized(uint256 outcomeId) external view returns (bool);
    function isPoolApproved(address pool) external view returns (bool);
    function outcomeToken() external view returns (address);
}
