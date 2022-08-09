// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BasicERC721.sol";

contract BasicERC721WithAccessControlMock is BasicERC721, AccessControl {
  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(BasicERC721, AccessControl)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
