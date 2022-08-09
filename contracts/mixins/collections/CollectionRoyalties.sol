// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "../../interfaces/IGetFees.sol";
import "../../interfaces/IGetRoyalties.sol";
import "../../interfaces/IRoyaltyInfo.sol";
import "../../interfaces/ITokenCreator.sol";

import "../shared/Constants.sol";

/**
 * @title Defines various royalty APIs for broad marketplace support.
 */
abstract contract CollectionRoyalties is IGetRoyalties, IGetFees, IRoyaltyInfo, ITokenCreator, ERC165Upgradeable {
  /**
   * @notice Returns an array of recipient addresses to which royalties for secondary sales should be sent.
   * The expected royalty amount is communicated with `getFeeBps`.
   * @param tokenId The tokenId of the NFT to get the royalty recipients for.
   * @return recipients An array of addresses to which royalties should be sent.
   */
  function getFeeRecipients(uint256 tokenId) external view returns (address payable[] memory recipients) {
    recipients = new address payable[](1);
    recipients[0] = getTokenCreatorPaymentAddress(tokenId);
  }

  /**
   * @notice Returns an array of royalties to be sent for secondary sales in basis points.
   * The expected recipients is communicated with `getFeeRecipients`.
   * @dev The tokenId param is ignored since all NFTs return the same value.
   * @return feesInBasisPoints The array of fees to be sent to each recipient, in basis points.
   */
  function getFeeBps(
    uint256 /* tokenId */
  ) external pure returns (uint256[] memory feesInBasisPoints) {
    feesInBasisPoints = new uint256[](1);
    feesInBasisPoints[0] = ROYALTY_IN_BASIS_POINTS;
  }

  /**
   * @notice Returns an array of royalties to be sent for secondary sales.
   * @dev The data is the same as when calling getFeeRecipients and getFeeBps separately.
   * @param tokenId The tokenId of the NFT to get the royalties for.
   * @return recipients An array of addresses to which royalties should be sent.
   * @return feesInBasisPoints The array of fees to be sent to each recipient address.
   */
  function getRoyalties(uint256 tokenId)
    external
    view
    returns (address payable[] memory recipients, uint256[] memory feesInBasisPoints)
  {
    recipients = new address payable[](1);
    recipients[0] = getTokenCreatorPaymentAddress(tokenId);
    feesInBasisPoints = new uint256[](1);
    feesInBasisPoints[0] = ROYALTY_IN_BASIS_POINTS;
  }

  /**
   * @notice The address to pay the proceeds/royalties for the collection.
   */
  function getTokenCreatorPaymentAddress(
    uint256 /* tokenId */
  ) public view virtual returns (address payable);

  /**
   * @notice Returns the receiver and the amount to be sent for a secondary sale.
   * @param tokenId The tokenId of the NFT to get the royalty recipient and amount for.
   * @param salePrice The total price of the sale.
   * @return receiver The royalty recipient address for this sale.
   * @return royaltyAmount The total amount that should be sent to the `receiver`.
   */
  function royaltyInfo(uint256 tokenId, uint256 salePrice)
    external
    view
    returns (address receiver, uint256 royaltyAmount)
  {
    receiver = getTokenCreatorPaymentAddress(tokenId);
    unchecked {
      royaltyAmount = salePrice / ROYALTY_RATIO;
    }
  }

  /**
   * @inheritdoc ERC165Upgradeable
   * @dev Checks the supported royalty interfaces.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool interfaceSupported) {
    if (
      interfaceId == type(IRoyaltyInfo).interfaceId ||
      interfaceId == type(ITokenCreator).interfaceId ||
      interfaceId == type(IGetRoyalties).interfaceId ||
      interfaceId == type(IGetFees).interfaceId
    ) {
      interfaceSupported = true;
    } else {
      interfaceSupported = super.supportsInterface(interfaceId);
    }
  }
}
