// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IOutcomeNft
/// @notice ERC-6909 multi-token that backs every DreamDEX event position.
/// @dev Positions are identified by (tokenId) across all pools on the venue.
///      Read a leg with `balanceOf(owner, tokenId)`.
interface IOutcomeNft {
    function balanceOf(address owner, uint256 tokenId) external view returns (uint256);

    /// @notice Grant an operator (pool) permission to move caller's tokens.
    function setOperator(address spender, bool approved) external returns (bool);
}
