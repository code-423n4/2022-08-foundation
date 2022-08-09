// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "../interfaces/INFTDropCollectionMint.sol";

contract NFTDropCollectionWithoutAccessControl is INFTDropCollectionMint, ERC165 {
  bool private sold;

  function mintCountTo(
    uint16, /* count */
    address /* to */
  ) external returns (uint256 firstTokenId) {
    sold = true;
    return 1;
  }

  function numberOfTokensAvailableToMint() external pure returns (uint256 count) {
    return 100;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
    if (interfaceId == type(INFTDropCollectionMint).interfaceId) {
      return true;
    }
    return super.supportsInterface(interfaceId);
  }

  function balanceOf(
    address /*account*/
  ) external pure returns (uint256) {
    return 0;
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
