// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title Defines a role for admin accounts.
 * @dev Wraps the default admin role from OpenZeppelin's AccessControl for easy integration.
 */
abstract contract AdminRole is Initializable, AccessControlUpgradeable {
  function _initializeAdminRole(address admin) internal onlyInitializing {
    // Grant the role to a specified account
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
  }

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "AdminRole: caller does not have the Admin role");
    _;
  }

  /**
   * @notice Adds the account to the list of approved admins.
   * @dev Only callable by admins as enforced by `grantRole`.
   * @param account The address to be approved.
   */
  function grantAdmin(address account) external {
    grantRole(DEFAULT_ADMIN_ROLE, account);
  }

  /**
   * @notice Removes the account from the list of approved admins.
   * @dev Only callable by admins as enforced by `revokeRole`.
   * @param account The address to be removed from the approved list.
   */
  function revokeAdmin(address account) external {
    revokeRole(DEFAULT_ADMIN_ROLE, account);
  }

  /**
   * @notice Checks if the account provided is an admin.
   * @param account The address to check.
   * @return approved True if the account is an admin.
   * @dev This call is used by the royalty registry contract.
   */
  function isAdmin(address account) public view returns (bool approved) {
    approved = hasRole(DEFAULT_ADMIN_ROLE, account);
  }

  /**
   * @notice This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[1000] private __gap;
}
