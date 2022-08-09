// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

interface INFTDropCollectionInitializer {
  function initialize(
    address payable _creator,
    string calldata _name,
    string calldata _symbol,
    string calldata _baseURI,
    bytes32 _postRevealBaseURIHash,
    uint32 _maxTokenId,
    address _additionalMinter,
    address payable _paymentAddress
  ) external;
}
