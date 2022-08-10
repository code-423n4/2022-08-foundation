// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "./interfaces/INFTCollectionInitializer.sol";
import "./interfaces/IGetRoyalties.sol";
import "./interfaces/ITokenCreator.sol";
import "./interfaces/IGetFees.sol";
import "./interfaces/IRoyaltyInfo.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./libraries/AddressLibrary.sol";

import "./mixins/collections/SequentialMintCollection.sol";
import "./mixins/collections/CollectionRoyalties.sol";
import "./mixins/shared/ContractFactory.sol";

/**
 * @title A collection of NFTs by a single creator.
 * @notice All NFTs from this contract are minted by the same creator.
 * A 10% royalty to the creator is included which may be split with collaborators on a per-NFT basis.
 */
contract NFTCollection is
  INFTCollectionInitializer,
  IGetRoyalties,
  IGetFees,
  IRoyaltyInfo,
  ITokenCreator,
  ContractFactory,
  Initializable,
  ERC165Upgradeable,
  ERC721Upgradeable,
  ERC721BurnableUpgradeable,
  SequentialMintCollection,
  CollectionRoyalties
{
  using AddressLibrary for address;
  using AddressUpgradeable for address;

  /**
   * @notice The baseURI to use for the tokenURI, if undefined then `ipfs://` is used.
   */
  string private baseURI_;

  /**
   * @dev Stores hashes minted to prevent duplicates.
   */
  mapping(string => bool) private cidToMinted;

  /**
   * @dev Stores an optional alternate address to receive creator revenue and royalty payments.
   * The target address may be a contract which could split or escrow payments.
   */
  mapping(uint256 => address payable) private tokenIdToCreatorPaymentAddress;

  /**
   * @dev Stores a CID for each NFT.
   */
  mapping(uint256 => string) private _tokenCIDs;

  /**
   * @notice Emitted when the owner changes the base URI to be used for NFTs in this collection.
   * @param baseURI The new base URI to use.
   */
  event BaseURIUpdated(string baseURI);
  /**
   * @notice Emitted when a new NFT is minted.
   * @param creator The address of the collection owner at this time this NFT was minted.
   * @param tokenId The tokenId of the newly minted NFT.
   * @param indexedTokenCID The CID of the newly minted NFT, indexed to enable watching for mint events by the tokenCID.
   * @param tokenCID The actual CID of the newly minted NFT.
   */
  event Minted(address indexed creator, uint256 indexed tokenId, string indexed indexedTokenCID, string tokenCID);
  /**
   * @notice Emitted when the payment address for creator royalties is set.
   * @param fromPaymentAddress The original address used for royalty payments.
   * @param toPaymentAddress The new address used for royalty payments.
   * @param tokenId The NFT which had the royalty payment address updated.
   */
  event TokenCreatorPaymentAddressSet(
    address indexed fromPaymentAddress,
    address indexed toPaymentAddress,
    uint256 indexed tokenId
  );

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
   * @param _name The collection's `name`.
   * @param _symbol The collection's `symbol`.
   */
  function initialize(
    address payable _creator,
    string memory _name,
    string memory _symbol
  ) external initializer onlyContractFactory {
    __ERC721_init(_name, _symbol);
    _initializeSequentialMintCollection(_creator, 0);
  }

  /**
   * @notice Allows the creator to burn a specific token if they currently own the NFT.
   * @param tokenId The ID of the NFT to burn.
   * @dev The function here asserts `onlyCreator` while the super confirms ownership.
   */
  function burn(uint256 tokenId) public override onlyCreator {
    super.burn(tokenId);
  }

  /**
   * @notice Mint an NFT defined by its metadata path.
   * @dev This is only callable by the collection creator/owner.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mint(string calldata tokenCID) external returns (uint256 tokenId) {
    tokenId = _mint(tokenCID);
  }

  /**
   * @notice Mint an NFT defined by its metadata path and approves the provided operator address.
   * @dev This is only callable by the collection creator/owner.
   * It can be used the first time they mint to save having to issue a separate approval
   * transaction before listing the NFT for sale.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @param operator The address to set as an approved operator for the creator's account.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mintAndApprove(string calldata tokenCID, address operator) external returns (uint256 tokenId) {
    tokenId = _mint(tokenCID);
    setApprovalForAll(operator, true);
  }

  /**
   * @notice Mint an NFT defined by its metadata path and have creator revenue/royalties sent to an alternate address.
   * @dev This is only callable by the collection creator/owner.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @param tokenCreatorPaymentAddress The royalty recipient address to use for this NFT.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mintWithCreatorPaymentAddress(string calldata tokenCID, address payable tokenCreatorPaymentAddress)
    public
    returns (uint256 tokenId)
  {
    require(tokenCreatorPaymentAddress != address(0), "NFTCollection: tokenCreatorPaymentAddress is required");
    tokenId = _mint(tokenCID);
    tokenIdToCreatorPaymentAddress[tokenId] = tokenCreatorPaymentAddress;
    emit TokenCreatorPaymentAddressSet(address(0), tokenCreatorPaymentAddress, tokenId);
  }

  /**
   * @notice Mint an NFT defined by its metadata path and approves the provided operator address.
   * @dev This is only callable by the collection creator/owner.
   * It can be used the first time they mint to save having to issue a separate approval
   * transaction before listing the NFT for sale.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @param tokenCreatorPaymentAddress The royalty recipient address to use for this NFT.
   * @param operator The address to set as an approved operator for the creator's account.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mintWithCreatorPaymentAddressAndApprove(
    string calldata tokenCID,
    address payable tokenCreatorPaymentAddress,
    address operator
  ) external returns (uint256 tokenId) {
    tokenId = mintWithCreatorPaymentAddress(tokenCID, tokenCreatorPaymentAddress);
    setApprovalForAll(operator, true);
  }

  /**
   * @notice Mint an NFT defined by its metadata path and have creator revenue/royalties sent to an alternate address
   * which is defined by a contract call, typically a proxy contract address representing the payment terms.
   * @dev This is only callable by the collection creator/owner.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @param paymentAddressFactory The contract to call which will return the address to use for payments.
   * @param paymentAddressCallData The call details to sent to the factory provided.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mintWithCreatorPaymentFactory(
    string calldata tokenCID,
    address paymentAddressFactory,
    bytes calldata paymentAddressCallData
  ) public returns (uint256 tokenId) {
    address payable tokenCreatorPaymentAddress = paymentAddressFactory.callAndReturnContractAddress(
      paymentAddressCallData
    );
    tokenId = mintWithCreatorPaymentAddress(tokenCID, tokenCreatorPaymentAddress);
  }

  /**
   * @notice Mint an NFT defined by its metadata path and have creator revenue/royalties sent to an alternate address
   * which is defined by a contract call, typically a proxy contract address representing the payment terms.
   * @dev This is only callable by the collection creator/owner.
   * It can be used the first time they mint to save having to issue a separate approval
   * transaction before listing the NFT for sale.
   * @param tokenCID The CID for the metadata json of the NFT to mint.
   * @param paymentAddressFactory The contract to call which will return the address to use for payments.
   * @param paymentAddressCallData The call details to sent to the factory provided.
   * @param operator The address to set as an approved operator for the creator's account.
   * @return tokenId The tokenId of the newly minted NFT.
   */
  function mintWithCreatorPaymentFactoryAndApprove(
    string calldata tokenCID,
    address paymentAddressFactory,
    bytes calldata paymentAddressCallData,
    address operator
  ) external returns (uint256 tokenId) {
    tokenId = mintWithCreatorPaymentFactory(tokenCID, paymentAddressFactory, paymentAddressCallData);
    setApprovalForAll(operator, true);
  }

  /**
   * @notice Allows the collection creator to destroy this contract only if
   * no NFTs have been minted yet or the minted NFTs have been burned.
   * @dev Once destructed, a new collection could be deployed to this address (although that's discouraged).
   */
  function selfDestruct() external onlyCreator {
    _selfDestruct();
  }

  /**
   * @notice Allows the owner to assign a baseURI to use for the tokenURI instead of the default `ipfs://`.
   * @param baseURIOverride The new base URI to use for all NFTs in this collection.
   */
  function updateBaseURI(string calldata baseURIOverride) external onlyCreator {
    baseURI_ = baseURIOverride;

    emit BaseURIUpdated(baseURIOverride);
  }

  /**
   * @notice Allows the owner to set a max tokenID.
   * This provides a guarantee to collectors about the limit of this collection contract, if applicable.
   * @dev Once this value has been set, it may be decreased but can never be increased.
   * This max may be less than the final `totalSupply` if 1 or more tokens were burned.
   * @param _maxTokenId The max tokenId to set, all NFTs must have a tokenId less than or equal to this value.
   */
  function updateMaxTokenId(uint32 _maxTokenId) external onlyCreator {
    _updateMaxTokenId(_maxTokenId);
  }

  function _burn(uint256 tokenId) internal override(ERC721Upgradeable, SequentialMintCollection) {
    delete cidToMinted[_tokenCIDs[tokenId]];
    delete tokenIdToCreatorPaymentAddress[tokenId];
    delete _tokenCIDs[tokenId];
    super._burn(tokenId);
  }

  function _mint(string calldata tokenCID) private onlyCreator returns (uint256 tokenId) {
    require(bytes(tokenCID).length != 0, "NFTCollection: tokenCID is required");
    require(!cidToMinted[tokenCID], "NFTCollection: NFT was already minted");
    unchecked {
      // Number of tokens cannot overflow 256 bits.
      tokenId = ++latestTokenId;
      require(maxTokenId == 0 || tokenId <= maxTokenId, "NFTCollection: Max token count has already been minted");
      cidToMinted[tokenCID] = true;
      _tokenCIDs[tokenId] = tokenCID;
      _mint(msg.sender, tokenId);
      emit Minted(msg.sender, tokenId, tokenCID, tokenCID);
    }
  }

  /**
   * @notice The base URI used for all NFTs in this collection.
   * @dev The `tokenCID` is appended to this to obtain an NFT's `tokenURI`.
   *      e.g. The URI for a token with the `tokenCID`: "foo" and `baseURI`: "ipfs://" is "ipfs://foo".
   * @return uri The base URI used by this collection.
   */
  function baseURI() external view returns (string memory uri) {
    uri = _baseURI();
  }

  /**
   * @notice Checks if the creator has already minted a given NFT using this collection contract.
   * @param tokenCID The CID to check for.
   * @return hasBeenMinted True if the creator has already minted an NFT with this CID.
   */
  function getHasMintedCID(string calldata tokenCID) external view returns (bool hasBeenMinted) {
    hasBeenMinted = cidToMinted[tokenCID];
  }

  /**
   * @inheritdoc CollectionRoyalties
   */
  function getTokenCreatorPaymentAddress(uint256 tokenId)
    public
    view
    override
    returns (address payable creatorPaymentAddress)
  {
    creatorPaymentAddress = tokenIdToCreatorPaymentAddress[tokenId];
    if (creatorPaymentAddress == address(0)) {
      creatorPaymentAddress = owner;
    }
  }

  /**
   * @inheritdoc IERC165Upgradeable
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC165Upgradeable, ERC721Upgradeable, CollectionRoyalties)
    returns (bool interfaceSupported)
  {
    // This is a no-op function required to avoid compile errors.
    interfaceSupported = super.supportsInterface(interfaceId);
  }

  /**
   * @inheritdoc IERC721MetadataUpgradeable
   */
  function tokenURI(uint256 tokenId) public view override returns (string memory uri) {
    require(_exists(tokenId), "NFTCollection: URI query for nonexistent token");

    uri = string.concat(_baseURI(), _tokenCIDs[tokenId]);
  }

  function _baseURI() internal view override returns (string memory) {
    if (bytes(baseURI_).length != 0) {
      return baseURI_;
    }
    return "ipfs://";
  }
}
