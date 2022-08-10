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
 * @title A contract to batch mint a collection of NFTs.
 * @notice A 10% royalty to the creator is included which may be split with collaborators.
 * @dev A collection can have up to 4,294,967,295 (2^32-1) tokens
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
   * @notice The base URI used for all NFTs in this collection.
   * @dev The `<tokenId>.json` is appended to this to obtain an NFT's `tokenURI`.
   *      e.g. The URI for `tokenId`: "1" with `baseURI`: "ipfs://foo/" is "ipfs://foo/1.json".
   * @return The base URI used by this collection.
   */
  string public baseURI;

  /****** Slot 2 ******/
  /**
   * @notice The hash of the revealed baseURI for the collection.
   * @dev This can be used to verify that the content was not changed after NFTs were minted.
   * @return bytes32(0) if the content has been revealed.
   * In pre-reveal state this is set to bytes32(1) when the final content is unknown
   * otherwise set to keccak256(finalContentBaseURI).
   */
  bytes32 public postRevealBaseURIHash;

  /****** End of storage ******/

  /**
   * @notice Emitted when the collection is revealed.
   * @param baseURI The base URI for the collection.
   * @param postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * Set to bytes32(0) if the content is revealed by default (note that revealed content is immutable).
   * If the post reveal content is unknown, use bytes32(uint(1)) to indicate the `baseURI` is pre-reveal content.
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
   * @notice Called by the contract factory on creation.
   * @param _creator The creator of this collection.
   * This account is the default admin for this collection.
   * @param _name The collection's `name`.
   * @param _symbol The collection's `symbol`.
   * @param _baseURI The base URI for the collection.
   * @param _postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * Set to bytes32(0) if the content is revealed by default (note that revealed content is immutable).
   * If the post reveal content is unknown, use bytes32(uint(1)) to indicate the `baseURI` is pre-reveal content.
   * @param _maxTokenId The max token id for this collection.
   * @param _approvedMinter An optional address to grant the MINTER_ROLE.
   * Set to address(0) if only admins should be granted permission to mint.
   * @param _paymentAddress The address that will receive royalties and mint payments.
   */
  function initialize(
    address payable _creator,
    string calldata _name,
    string calldata _symbol,
    string calldata _baseURI,
    bytes32 _postRevealBaseURIHash,
    uint32 _maxTokenId,
    address _approvedMinter,
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
    if (_approvedMinter != address(0)) {
      MinterRole._initializeMinterRole(_approvedMinter);
    }
  }

  /**
   * @notice Allows the collection admin to burn a specific token if they currently own the NFT.
   * @param tokenId The ID of the NFT to burn.
   * @dev The function here asserts `onlyAdmin` while the super confirms ownership.
   */
  function burn(uint256 tokenId) public override onlyAdmin {
    super.burn(tokenId);
  }

  /**
   * @notice Mint `count` number of NFTs for the `to` address.
   * @dev This is only callable by an address with either the MINTER_ROLE or the DEFAULT_ADMIN_ROLE.
   * @param count The number of NFTs to mint.
   * @param to The address to mint the NFTs for.
   * @return firstTokenId The tokenId for the first NFT minted.
   * The other minted tokens are assigned sequentially, so `firstTokenId` - `firstTokenId + count - 1` were minted.
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
   * @notice Allows a collection admin to reveal the collection's final content.
   * @dev Once revealed, the collection's content is immutable.
   * Use `updatePreRevealContent` to update content while unrevealed.
   * @param _baseURI The base URI of the final content for this collection.
   */
  function reveal(string calldata _baseURI) external onlyAdmin validBaseURI(_baseURI) onlyWhileUnrevealed {
    // `postRevealBaseURIHash` == 0 indicates that the collection has been revealed.
    delete postRevealBaseURIHash;

    // Set the new base URI.
    baseURI = _baseURI;
    emit URIUpdated(_baseURI, "");
  }

  /**
   * @notice Allows a collection admin to destroy this contract only if
   * no NFTs have been minted yet or the minted NFTs have been burned.
   * @dev Once destructed, a new collection could be deployed to this address (although that's discouraged).
   */
  function selfDestruct() external onlyAdmin {
    _selfDestruct();
  }

  /**
   * @notice Allows the owner to set a max tokenID.
   * This provides a guarantee to collectors about the limit of this collection contract.
   * @dev Once this value has been set, it may be decreased but can never be increased.
   * This max may be less than the final `totalSupply` if 1 or more tokens were burned.
   * @param _maxTokenId The max tokenId to set, all NFTs must have a tokenId less than or equal to this value.
   */
  function updateMaxTokenId(uint32 _maxTokenId) external onlyAdmin {
    _updateMaxTokenId(_maxTokenId);
  }

  /**
   * @notice Allows a collection admin to update the pre-reveal content.
   * @dev Use `reveal` to reveal the final content for this collection.
   * @param _baseURI The base URI of the pre-reveal content.
   * @param _postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * Set to bytes32(0) if the content is revealed by default (note that revealed content is immutable).
   * If the post reveal content is unknown, use bytes32(uint(1)) to indicate the `baseURI` is pre-reveal content.
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
   * @inheritdoc CollectionRoyalties
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
   * @dev Once revealed, the collection's content is immutable.
   * @return revealed True if the collection has been revealed.
   */
  function isRevealed() external view returns (bool revealed) {
    revealed = postRevealBaseURIHash == bytes32(0);
  }

  /**
   * @notice Get the number of tokens which can still be minted.
   * @return count The max number of additional NFTs that can be minted by this collection.
   */
  function numberOfTokensAvailableToMint() external view returns (uint256 count) {
    // Mint ensures that latestTokenId is always <= maxTokenId
    unchecked {
      count = maxTokenId - latestTokenId;
    }
  }

  /**
   * @inheritdoc IERC165Upgradeable
   */
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
   * @inheritdoc IERC721MetadataUpgradeable
   */
  function tokenURI(uint256 tokenId) public view override returns (string memory uri) {
    _requireMinted(tokenId);

    return string.concat(baseURI, tokenId.toString(), ".json");
  }
}
