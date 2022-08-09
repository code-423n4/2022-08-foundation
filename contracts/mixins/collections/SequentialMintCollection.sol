// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";

import "../../interfaces/ITokenCreator.sol";

/**
 * @title Extends the OZ ERC721 implementation for collections which mint sequential token IDs.
 */
abstract contract SequentialMintCollection is ITokenCreator, Initializable, ERC721BurnableUpgradeable {
  /****** Slot 0 (after inheritance) ******/
  /**
   * @notice The creator/owner of this NFT collection.
   * @dev This is the default royalty recipient if an different `paymentAddress` was not provided.
   */
  address payable public owner;

  /**
   * @notice The tokenId of the most recently created NFT.
   * @dev Minting starts at tokenId 1. Each mint will use this value + 1.
   */
  uint32 public latestTokenId;

  /**
   * @notice The max tokenId which can be minted.
   */
  uint32 public maxTokenId;

  /**
   * @notice Tracks how many tokens have been burned.
   * @dev This number is used to calculate the total supply efficiently.
   */
  uint32 private burnCounter;

  /****** End of storage ******/

  /**
   * @notice Emitted when the max tokenId supported by this collection is defined.
   * @param maxTokenId The new max tokenId. All NFTs in this collection will have a tokenId less than
   * or equal to this value.
   */
  event MaxTokenIdUpdated(uint256 indexed maxTokenId);

  /**
   * @notice Emitted when this collection is self destructed by the owner.
   * @param admin A collection admin at the time this collection was self destructed.
   */
  event SelfDestruct(address indexed admin);

  modifier onlyCreator() {
    require(msg.sender == owner, "SequentialMintCollection: Caller is not creator");
    _;
  }

  function _initializeSequentialMintCollection(address payable _creator, uint32 _maxTokenId) internal onlyInitializing {
    require(_creator != address(0), "SequentialMintCollection: Creator cannot be the zero address");

    owner = _creator;
    maxTokenId = _maxTokenId;
  }

  /**
   * @notice Allows the collection owner to destroy this contract only if
   * no NFTs have been minted yet or the minted NFTs have been burned.
   */
  function _selfDestruct() internal {
    require(totalSupply() == 0, "SequentialMintCollection: Any NFTs minted must be burned first");

    emit SelfDestruct(msg.sender);
    selfdestruct(payable(msg.sender));
  }

  /**
   * @notice Allows the owner to set a max tokenID.
   * This provides a guarantee to collectors about the limit of this collection contract, if applicable.
   * @dev Once this value has been set, it may be decreased but can never be increased.
   * @param _maxTokenId The max tokenId to set, all NFTs must have a tokenId less than or equal to this value.
   */
  function _updateMaxTokenId(uint32 _maxTokenId) internal {
    require(_maxTokenId != 0, "SequentialMintCollection: Max token ID may not be cleared");
    require(maxTokenId == 0 || _maxTokenId < maxTokenId, "SequentialMintCollection: Max token ID may not increase");
    require(latestTokenId <= _maxTokenId, "SequentialMintCollection: Max token ID must be >= last mint");

    maxTokenId = _maxTokenId;
    emit MaxTokenIdUpdated(_maxTokenId);
  }

  function _burn(uint256 tokenId) internal virtual override {
    unchecked {
      // Number of burned tokens cannot exceed latestTokenId which is the same size.
      ++burnCounter;
    }
    super._burn(tokenId);
  }

  /**
   * @notice Returns the creator of this NFT collection.
   * @dev The tokenId param is ignored since all NFTs return the same value.
   * @return creator The creator of this collection.
   */
  function tokenCreator(
    uint256 /* tokenId */
  ) external view returns (address payable creator) {
    creator = owner;
  }

  /**
   * @notice Count of NFTs tracked by this contract.
   * @dev From the ERC-721 enumerable standard.
   * @return supply The total number of NFTs still tracked by this contract.
   */
  function totalSupply() public view returns (uint256 supply) {
    unchecked {
      // Number of tokens minted is always >= burned tokens.
      supply = latestTokenId - burnCounter;
    }
  }
}
