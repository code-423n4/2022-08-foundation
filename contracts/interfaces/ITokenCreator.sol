// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

interface ITokenCreator {
  function tokenCreator(uint256 tokenId) external view returns (address payable);
}
