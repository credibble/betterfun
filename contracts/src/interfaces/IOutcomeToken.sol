// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IOutcomeToken
/// @notice ERC-6909 multi-token that backs every DreamDEX event position.
/// @dev Positions are identified by tokenId across all pools on the venue.
interface IOutcomeToken {
    function balanceOf(address owner, uint256 tokenId) external view returns (uint256);
    function allowance(address owner, address spender, uint256 tokenId) external view returns (uint256);
    function isOperator(address owner, address spender) external view returns (bool);
    function approve(address spender, uint256 tokenId, uint256 amount) external returns (bool);
    function setOperator(address spender, bool approved) external returns (bool);
    function transfer(address receiver, uint256 tokenId, uint256 amount) external returns (bool);
    function transferFrom(address sender, address receiver, uint256 tokenId, uint256 amount) external returns (bool);
}
