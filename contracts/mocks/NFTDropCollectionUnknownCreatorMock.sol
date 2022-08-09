// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "../interfaces/INFTDropCollectionMint.sol";

contract NFTDropCollectionUnknownCreatorMock is INFTDropCollectionMint, ERC165, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bool private sold;

  constructor(address additionalMinter) {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
    if (additionalMinter != address(0)) {
      _grantRole(MINTER_ROLE, additionalMinter);
    }
  }

  function mintCountTo(
    uint16, /* count */
    address /* to */
  ) external returns (uint256 firstTokenId) {
    sold = true;
    return 1;
  }

  function numberOfTokensAvailableToMint() external view returns (uint256 count) {
    return sold ? 97 : 100;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, AccessControl) returns (bool) {
    if (interfaceId == type(INFTDropCollectionMint).interfaceId) {
      return true;
    }
    return super.supportsInterface(interfaceId);
  }

  function balanceOf(
    address /*account*/
  ) external view returns (uint256) {
    return sold ? 3 : 0;
  }

  function ownerOf(
    uint256 /* tokenId */
  ) external view returns (address) {
    if (sold) {
      return address(0x1);
    }
    return address(0);
  }
}
