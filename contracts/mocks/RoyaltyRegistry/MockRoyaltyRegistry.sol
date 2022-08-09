// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@manifoldxyz/royalty-registry-solidity/contracts/IRoyaltyRegistry.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockRoyaltyRegistry is IRoyaltyRegistry, ERC165 {
  function setRoyaltyLookupAddress(address tokenAddress, address royaltyAddress)
    external
    virtual
  // solhint-disable-next-line no-empty-blocks
  {

  }

  function getRoyaltyLookupAddress(address tokenAddress) external view virtual returns (address) {
    return tokenAddress;
  }

  function overrideAllowed(
    address /* tokenAddress */
  ) external view virtual returns (bool) {
    return true;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
    return interfaceId == type(IRoyaltyRegistry).interfaceId || super.supportsInterface(interfaceId);
  }
}
