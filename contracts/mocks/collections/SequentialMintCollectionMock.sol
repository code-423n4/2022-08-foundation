// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../../mixins/collections/SequentialMintCollection.sol";

contract SequentialMintCollectionMock is Initializable, SequentialMintCollection {
  function initializeWithModifier(address payable _creator, uint32 _maxTokenId) external initializer {
    SequentialMintCollection._initializeSequentialMintCollection(_creator, _maxTokenId);
  }

  function initializeWithoutModifier(address payable _creator, uint32 _maxTokenId) external {
    SequentialMintCollection._initializeSequentialMintCollection(_creator, _maxTokenId);
  }
}
