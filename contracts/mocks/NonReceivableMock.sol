// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract NonReceivableMock {
  using AddressUpgradeable for address;

  function callContract(address _contract, bytes memory _callData) public payable {
    _contract.functionCallWithValue(_callData, msg.value);
  }
}
