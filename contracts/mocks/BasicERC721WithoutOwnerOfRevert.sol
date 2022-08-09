// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "./BasicERC721WithAccessControlMock.sol";
import "../interfaces/INFTDropCollectionMint.sol";

/**
 * @notice A basic ERC721 which has ownerOf return address(0) instead of reverting when token does not exist.
 */
contract BasicERC721WithoutOwnerOfRevert is
  INFTDropCollectionMint,
  ERC165Upgradeable,
  BasicERC721WithAccessControlMock
{
  uint256 private id = 0;

  function ownerOf(uint256 tokenId) public view virtual override returns (address owner) {
    return _owners[tokenId];
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC165Upgradeable, BasicERC721WithAccessControlMock)
    returns (bool)
  {
    if (type(INFTDropCollectionMint).interfaceId == interfaceId) {
      return true;
    }
    return super.supportsInterface(interfaceId);
  }

  function mintCountTo(uint16 count, address to) external returns (uint256 firstTokenId) {
    firstTokenId = id + 1;
    id += count;
    _owners[firstTokenId] = to;
    _balances[to] += count;
  }

  function numberOfTokensAvailableToMint() external view override returns (uint256 count) {
    return 100 - id;
  }
}
