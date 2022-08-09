// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./interfaces/INFTDropCollectionInitializer.sol";
import "./interfaces/INFTDropCollectionMint.sol";

import "./mixins/collections/CollectionRoyalties.sol";
import "./mixins/collections/SequentialMintCollection.sol";
import "./mixins/roles/AdminRole.sol";
import "./mixins/roles/MinterRole.sol";
import "./mixins/shared/Constants.sol";
import "./mixins/shared/ContractFactory.sol";

/**
 * @title A contract to batch mint and reveal a collection of NFTs.
 * @notice A 10% royalty to the creator is included which may be split
 * with collaborators.
 */
contract NFTDropCollection is
  INFTDropCollectionInitializer,
  INFTDropCollectionMint,
  IGetRoyalties,
  IGetFees,
  IRoyaltyInfo,
  ITokenCreator,
  ContractFactory,
  Initializable,
  ContextUpgradeable,
  ERC165Upgradeable,
  AccessControlUpgradeable,
  AdminRole,
  MinterRole,
  ERC721Upgradeable,
  ERC721BurnableUpgradeable,
  SequentialMintCollection,
  CollectionRoyalties
{
  using Strings for uint256;

  /****** Slot 0 (after inheritance) ******/
  /**
   * @notice The address to pay the proceeds/royalties for the collection.
   * @dev If this is set to address(0) then the proceeds go to the creator.
   */
  address payable private paymentAddress;
  // 96 bits free space

  /****** Slot 1 ******/
  /**
   * @notice Base URI for the Collection.
   * @dev TokenId is concatenated with the baseURI to obtain an NFT in the collection.
   *      e.g. The address for `tokenId`: '1' with `baseURI`: "ipfs://foo/" is "ipfs://foo/1".
   */
  string public baseURI;

  /****** Slot 2 ******/
  /**
   * @notice Hash of the `baseURI` for the collection.
   * @dev The value is set bytes(0) if the collection is revealed or public by default.
   */
  bytes32 public postRevealBaseURIHash;

  /****** End of storage ******/

  /**
   * @notice Emitted when the collection is revealed.
   * @param baseURI The base URI for the collection.
   * @param postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * @dev If postRevealBaseURIHash is empty, signals that the collection has been revealed.
   * When both baseURI and postRevealBaseURIHash are set,
   * baseURI is the pre-reveal content and signals the collection has not been revealed yet.
   */
  event URIUpdated(string baseURI, bytes32 postRevealBaseURIHash);

  modifier validBaseURI(string calldata _baseURI) {
    require(bytes(_baseURI).length > 0, "NFTDropCollection: `_baseURI` must be set");
    _;
  }

  modifier onlyWhileUnrevealed() {
    require(postRevealBaseURIHash != bytes32(0), "NFTDropCollection: Already revealed");
    _;
  }

  /**
   * @notice Initialize the template's immutable variables.
   * @param _contractFactory The factory which will be used to create collection contracts.
   */
  constructor(address _contractFactory)
    ContractFactory(_contractFactory) // solhint-disable-next-line no-empty-blocks
  {}

  /**
   * @notice Initializer for the collection, called by the factory on creation.
   * @param _creator The creator of this collection contract.
   * @param _name The name of this collection.
   * @param _symbol The symbol for this collection.
   * @param _baseURI The base URI for the collection.
   * @param _postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * @param _maxTokenId The max token id for this collection.
   * @param _additionalMinter An additional address to grant MINTER_ROLE.
   * @param _paymentAddress The address to send proceeds of this collection.
   * @dev Notes:
   *   a) `_creator` is granted `DEFAULT_ADMIN_ROLE` by default.
   *   b) Set `_additionalMinter` to address(0) if not needed.
   *   c) For a collection without a reveal, set `_baseURI`
   *      to the actual baseURI (e.g. "ipfs://foo/") and do not set `_postRevealBaseURIHash`.
   *   d) A collection can have up to 4,294,967,295 (2^32-1) tokens.
   */
  function initialize(
    address payable _creator,
    string calldata _name,
    string calldata _symbol,
    string calldata _baseURI,
    bytes32 _postRevealBaseURIHash,
    uint32 _maxTokenId,
    address _additionalMinter,
    address payable _paymentAddress
  ) external initializer onlyContractFactory validBaseURI(_baseURI) {
    require(bytes(_symbol).length > 0, "NFTDropCollection: `_symbol` must be set");
    require(_maxTokenId > 0, "NFTDropCollection: `_maxTokenId` must be set");

    // Initialize the NFT
    __ERC721_init(_name, _symbol);
    _initializeSequentialMintCollection(_creator, _maxTokenId);

    // Initialize royalties
    if (_paymentAddress != address(0)) {
      // If no payment address was defined, use the creator's address.
      paymentAddress = _paymentAddress;
    }

    // Initialize URI
    baseURI = _baseURI;
    postRevealBaseURIHash = _postRevealBaseURIHash;

    // Initialize access control
    AdminRole._initializeAdminRole(_creator);
    if (_additionalMinter != address(0)) {
      MinterRole._initializeMinterRole(_additionalMinter);
    }
  }

  /**
   * @notice Allows the collection owner to burn a specific token.
   * The token must be owned by the collection admin.
   * @dev The function here asserts onlyAdmin while the super confirms ownership.
   */
  function burn(uint256 tokenId) public override onlyAdmin {
    super.burn(tokenId);
  }

  /**
   * @notice Allows minting `count` number of NFTs for the `to` address.
   * @param count The count of NFTs to mint.
   * @param to The address to mint the NFTs for.
   */
  function mintCountTo(uint16 count, address to) external onlyMinterOrAdmin returns (uint256 firstTokenId) {
    require(count != 0, "NFTDropCollection: `count` must be greater than 0");

    unchecked {
      // If +1 overflows then +count would also overflow, unless count==0 in which case the loop would exceed gas limits
      firstTokenId = latestTokenId + 1;
    }
    latestTokenId = latestTokenId + count;
    require(latestTokenId <= maxTokenId, "NFTDropCollection: Exceeds max tokenId");

    for (uint256 i = firstTokenId; i <= latestTokenId; ) {
      _mint(to, i);
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Allows the collection owner to reveal the collection.
   * @dev Notes:
   *   a) The collection can only be revealed once.
   *   b) use updatePreRevealContent() to update pre-reveal content not reveal()
   */
  function reveal(string calldata _baseURI) external onlyAdmin validBaseURI(_baseURI) onlyWhileUnrevealed {
    // `postRevealBaseURIHash` == 0 indicates that the collection has been revealed.
    delete postRevealBaseURIHash;

    // Set the new base URI.
    baseURI = _baseURI;
    emit URIUpdated(_baseURI, "");
  }

  /**
   * @notice Allows the collection owner to destroy this contract only if
   * no NFTs have been minted yet or the minted NFTs have been burned.
   */
  function selfDestruct() external onlyAdmin {
    _selfDestruct();
  }

  /**
   * @notice Allows the owner to set a max tokenID.
   * This provides a guarantee to collectors about the limit of this collection contract, if applicable.
   * @dev Once this value has been set, it may be decreased but can never be increased.
   * @param _maxTokenId The max tokenId to set, all NFTs must have a tokenId less than or equal to this value.
   */
  function updateMaxTokenId(uint32 _maxTokenId) external onlyAdmin {
    _updateMaxTokenId(_maxTokenId);
  }

  /**
   * @notice Allows the collection owner to update the pre-reveal content.
   * @dev Notes:
   *    a) Use reveal() to reveal collection not this fn.
   *    b) This fn should only be used if:
   *         i) the unrevealed baseURI has changed and the postRevealBaseURIHash needs to
   *            be updated (set `_postRevealBaseURIHash`)
   *         ii) pre-reveal URI needs to be updated (set `_baseURI`)
   */
  function updatePreRevealContent(string calldata _baseURI, bytes32 _postRevealBaseURIHash)
    external
    validBaseURI(_baseURI)
    onlyWhileUnrevealed
    onlyAdmin
  {
    require(_postRevealBaseURIHash != bytes32(0), "NFTDropCollection: use `reveal` instead");

    postRevealBaseURIHash = _postRevealBaseURIHash;
    baseURI = _baseURI;
    emit URIUpdated(baseURI, postRevealBaseURIHash);
  }

  function _burn(uint256 tokenId) internal override(ERC721Upgradeable, SequentialMintCollection) {
    super._burn(tokenId);
  }

  /**
   * @notice The address to pay the proceeds/royalties for the collection.
   */
  function getTokenCreatorPaymentAddress(
    uint256 /* tokenId */
  ) public view override returns (address payable creatorPaymentAddress) {
    creatorPaymentAddress = paymentAddress;
    if (creatorPaymentAddress == address(0)) {
      creatorPaymentAddress = owner;
    }
  }

  /**
   * @notice Returns whether the collection has been revealed.
   */
  function isRevealed() external view returns (bool revealed) {
    revealed = postRevealBaseURIHash == bytes32(0);
  }

  /**
   * @notice Returns the number of tokens which can still be minted.
   */
  function numberOfTokensAvailableToMint() external view returns (uint256 count) {
    // Mint ensures that latestTokenId is always <= maxTokenId
    unchecked {
      count = maxTokenId - latestTokenId;
    }
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC165Upgradeable, AccessControlUpgradeable, ERC721Upgradeable, CollectionRoyalties)
    returns (bool interfaceSupported)
  {
    if (interfaceId == type(INFTDropCollectionMint).interfaceId) {
      interfaceSupported = true;
    } else {
      interfaceSupported = super.supportsInterface(interfaceId);
    }
  }

  /**
   * @inheritdoc ERC721Upgradeable
   */
  function tokenURI(uint256 tokenId) public view override returns (string memory uri) {
    _requireMinted(tokenId);

    return string.concat(baseURI, tokenId.toString(), ".json");
  }
}
