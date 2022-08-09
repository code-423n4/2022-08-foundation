// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

contract MockTreasury {
  // solhint-disable no-empty-blocks
  receive() external payable {}

  function isAdmin(
    address /*account*/
  ) external pure returns (bool) {
    return true;
  }
}
