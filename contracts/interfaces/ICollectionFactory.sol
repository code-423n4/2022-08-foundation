// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "./IRoles.sol";
import "./IProxyCall.sol";

interface ICollectionFactory {
  function rolesContract() external returns (IRoles);
}
