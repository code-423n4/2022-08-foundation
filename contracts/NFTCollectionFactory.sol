/*
  ･
   *　★
      ･ ｡
        　･　ﾟ☆ ｡
  　　　 *　★ ﾟ･｡ *  ｡
          　　* ☆ ｡･ﾟ*.｡
      　　　ﾟ *.｡☆｡★　･
​
                      `                     .-:::::-.`              `-::---...```
                     `-:`               .:+ssssoooo++//:.`       .-/+shhhhhhhhhhhhhyyyssooo:
                    .--::.            .+ossso+/////++/:://-`   .////+shhhhhhhhhhhhhhhhhhhhhy
                  `-----::.         `/+////+++///+++/:--:/+/-  -////+shhhhhhhhhhhhhhhhhhhhhy
                 `------:::-`      `//-.``.-/+ooosso+:-.-/oso- -////+shhhhhhhhhhhhhhhhhhhhhy
                .--------:::-`     :+:.`  .-/osyyyyyyso++syhyo.-////+shhhhhhhhhhhhhhhhhhhhhy
              `-----------:::-.    +o+:-.-:/oyhhhhhhdhhhhhdddy:-////+shhhhhhhhhhhhhhhhhhhhhy
             .------------::::--  `oys+/::/+shhhhhhhdddddddddy/-////+shhhhhhhhhhhhhhhhhhhhhy
            .--------------:::::-` +ys+////+yhhhhhhhddddddddhy:-////+yhhhhhhhhhhhhhhhhhhhhhy
          `----------------::::::-`.ss+/:::+oyhhhhhhhhhhhhhhho`-////+shhhhhhhhhhhhhhhhhhhhhy
         .------------------:::::::.-so//::/+osyyyhhhhhhhhhys` -////+shhhhhhhhhhhhhhhhhhhhhy
       `.-------------------::/:::::..+o+////+oosssyyyyyyys+`  .////+shhhhhhhhhhhhhhhhhhhhhy
       .--------------------::/:::.`   -+o++++++oooosssss/.     `-//+shhhhhhhhhhhhhhhhhhhhyo
     .-------   ``````.......--`        `-/+ooooosso+/-`          `./++++///:::--...``hhhhyo
                                              `````
   *　
      ･ ｡
　　　　･　　ﾟ☆ ｡
  　　　 *　★ ﾟ･｡ *  ｡
          　　* ☆ ｡･ﾟ*.｡
      　　　ﾟ *.｡☆｡★　･
    *　　ﾟ｡·*･｡ ﾟ*
  　　　☆ﾟ･｡°*. ﾟ
　 ･ ﾟ*｡･ﾟ★｡
　　･ *ﾟ｡　　 *
　･ﾟ*｡★･
 ☆∴｡　*
･ ｡
*/

// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./interfaces/ICollectionFactory.sol";
import "./interfaces/INFTDropCollectionInitializer.sol";
import "./interfaces/INFTCollectionInitializer.sol";
import "./interfaces/IRoles.sol";

import "./libraries/AddressLibrary.sol";
import "./mixins/shared/Gap10000.sol";

/**
 * @title A factory to create NFT collections.
 * @notice Call this factory to create a batch mint and reveal collection.
 * @dev This creates and initializes an ERC-1165 minimal proxy pointing to a NFT collection contract template.
 */
contract NFTCollectionFactory is ICollectionFactory, Initializable, Gap10000 {
  using AddressUpgradeable for address;
  using Clones for address;
  using Strings for uint32;

  /****** Slot 0 (after inheritance) ******/
  /**
   * @notice The address of the template all new NFTCollections will leverage.
   */
  address public implementationNFTCollection;

  /**
   * @notice The implementation version of new NFTCollections.
   * @dev This is auto-incremented each time the implementation is changed.
   */
  uint32 public versionNFTCollection;

  /****** Slot 1 ******/
  /**
   * @notice The address of the template all new NFTDropCollections will leverage.
   */
  address public implementationNFTDropCollection;

  /**
   * @notice The implementation version of new NFTDropCollections.
   * @dev This is auto-incremented each time the implementation is changed.
   */
  uint32 public versionNFTDropCollection;

  /****** End of storage ******/

  /**
   * @notice The contract address which manages common roles.
   * @dev Used by the NFTCollections for a shared operator definition.
   */
  IRoles public immutable rolesContract;

  /**
   * @notice Emitted when the implementation NFTCollection used by new collections is updated.
   * @param implementation The new implementation contract address.
   * @param version The version of the new implementation, auto-incremented.
   */
  event ImplementationNFTCollectionUpdated(address indexed implementation, uint256 indexed version);

  /**
   * @notice Emitted when the implementation contract used by new collections is updated.
   * @param implementationNFTDropCollection The new implementation contract address.
   * @param version The version of the new implementation, auto-incremented.
   */
  event ImplementationNFTDropCollectionUpdated(
    address indexed implementationNFTDropCollection,
    uint256 indexed version
  );

  /**
   * @notice Emitted when a new NFTCollection is created from this factory.
   * @param collection The address of the new NFT collection contract.
   * @param creator The address of the creator which owns the new collection.
   * @param version The implementation version used by the new collection.
   * @param name The name of the collection contract created.
   * @param symbol The symbol of the collection contract created.
   * @param nonce The nonce used by the creator when creating the collection,
   * used to define the address of the collection.
   */
  event NFTCollectionCreated(
    address indexed collection,
    address indexed creator,
    uint256 indexed version,
    string name,
    string symbol,
    uint256 nonce
  );

  /**
   * @notice Emitted when a new NFTDropCollection collection is created from this factory.
   * @param collection The address of the new NFTDropCollection contract.
   * @param creator The address of the creator which owns the new collection.
   * @param additionalMinter An additional address to grant MINTER_ROLE.
   * used to define the address of the collection.
   * @param name The name of the collection contract created.
   * @param symbol The symbol of the collection contract created.
   * @param baseURI The base URI for the collection.
   * @param postRevealBaseURIHash The hash of the revealed baseURI for the collection.
   * @param maxTokenId The max token id for this collection.
   * @param paymentAddress The address to send the proceeds of the drop.
   * @param version The implementation version used by the new NFTDropCollection collection.
   * @param nonce The nonce used by the creator when creating the collection,
   */
  event NFTDropCollectionCreated(
    address indexed collection,
    address indexed creator,
    address indexed additionalMinter,
    string name,
    string symbol,
    string baseURI,
    bytes32 postRevealBaseURIHash,
    uint256 maxTokenId,
    address paymentAddress,
    uint256 version,
    uint256 nonce
  );

  modifier onlyAdmin() {
    require(rolesContract.isAdmin(msg.sender), "NFTCollectionFactory: Caller does not have the Admin role");
    _;
  }

  /**
   * @notice Defines requirements for the collection drop factory at deployment time.
   * @param _rolesContract The address of the contract defining roles for collections to use.
   */
  constructor(address _rolesContract) {
    require(_rolesContract.isContract(), "NFTCollectionFactory: RolesContract is not a contract");

    rolesContract = IRoles(_rolesContract);
  }

  /**
   * @notice Initializer called after contract creation.
   * @param _versionNFTCollection The current implementation version for NFTCollections.
   */
  function initialize(uint32 _versionNFTCollection) external initializer {
    versionNFTCollection = _versionNFTCollection;
  }

  /**
   * @notice Allows Foundation to change the collection implementation used for future collections.
   * This call will auto-increment the version.
   * Existing collections are not impacted.
   * @param _implementation The new NFTCollection collection implementation address.
   */
  function adminUpdateNFTCollectionImplementation(address _implementation) external onlyAdmin {
    require(_implementation.isContract(), "NFTCollectionFactory: Implementation is not a contract");
    implementationNFTCollection = _implementation;
    unchecked {
      // Version cannot overflow 256 bits.
      versionNFTCollection++;
    }

    // The implementation is initialized when assigned so that others may not claim it as their own.
    INFTCollectionInitializer(_implementation).initialize(
      payable(address(rolesContract)),
      string.concat("NFT Collection Template v", versionNFTCollection.toString()),
      string.concat("NFTv", versionNFTCollection.toString())
    );

    emit ImplementationNFTCollectionUpdated(_implementation, versionNFTCollection);
  }

  /**
   * @notice Allows Foundation to change the collection implementation used for future collections.
   * This call will auto-increment the version.
   * Existing collections are not impacted.
   * @param _implementation The new NFTDropCollection collection implementation address.
   */
  function adminUpdateNFTDropCollectionImplementation(address _implementation) external onlyAdmin {
    require(_implementation.isContract(), "NFTCollectionFactory: Implementation is not a contract");
    implementationNFTDropCollection = _implementation;
    unchecked {
      // Version cannot overflow 256 bits.
      versionNFTDropCollection++;
    }

    emit ImplementationNFTDropCollectionUpdated(_implementation, versionNFTDropCollection);

    // The implementation is initialized when assigned so that others may not claim it as their own.
    INFTDropCollectionInitializer(_implementation).initialize(
      payable(address(this)),
      string.concat("NFT Drop Collection Template v", versionNFTDropCollection.toString()),
      string.concat("NFTDropV", versionNFTDropCollection.toString()),
      "ipfs://QmdB9mCxSsbybucRqtbBGGZf88pSoaJnuQ25FS3GJQvVAx/nft.png",
      0x1337000000000000000000000000000000000000000000000000000000001337,
      1,
      address(0),
      payable(0)
    );
  }

  /**
   * @notice Create a new collection contract.
   * @dev The nonce is required and must be unique for the msg.sender + implementation version,
   * otherwise this call will revert.
   * @param name The name for the new collection being created.
   * @param symbol The symbol for the new collection being created.
   * @param nonce An arbitrary value used to allow a creator to mint multiple collections.
   * @return collection The address of the new collection contract.
   */
  function createNFTCollection(
    string calldata name,
    string calldata symbol,
    uint256 nonce
  ) external returns (address collection) {
    require(bytes(symbol).length != 0, "NFTCollectionFactory: Symbol is required");

    // This reverts if the NFT was previously created using this implementation version + msg.sender + nonce
    collection = implementationNFTCollection.cloneDeterministic(_getSalt(msg.sender, nonce));

    INFTCollectionInitializer(collection).initialize(payable(msg.sender), name, symbol);

    emit NFTCollectionCreated(collection, msg.sender, versionNFTCollection, name, symbol, nonce);
  }

  /**
   * @notice Create a new collection contract.
   * @dev The nonce is required and must be unique for the msg.sender + implementation version,
   * otherwise this call will revert.
   * @param name The name for the new collection being created.
   * @param symbol The symbol for the new collection being created.
   * @param baseURI The base URI for the collection.
   * @param postRevealBaseURIHash The hash of the revealed baseURI for the collection,
   * leave empty for collection revealed by default.
   * @param maxTokenId The max token id for this collection.
   * @param additionalMinter An optional address to grant the MINTER_ROLE.
   * @param nonce An arbitrary value used to allow a creator to mint multiple collections.
   * @return collection The address of the new NFTDropCollection collection contract.
   */
  function createNFTDropCollection(
    string calldata name,
    string calldata symbol,
    string calldata baseURI,
    bytes32 postRevealBaseURIHash,
    uint32 maxTokenId,
    address additionalMinter,
    uint256 nonce
  ) external returns (address collection) {
    return
      _createNFTDropCollection(
        name,
        symbol,
        baseURI,
        postRevealBaseURIHash,
        maxTokenId,
        additionalMinter,
        payable(0),
        nonce
      );
  }

  /**
   * @notice Create a new collection contract with a custom payment address.
   * @param paymentAddress The address that will receive royalties and mint payments.
   * Notes:
   *   a) For rest of `params` see `createNFTDropCollection` above.
   */
  function createNFTDropCollectionWithPaymentAddress(
    string calldata name,
    string calldata symbol,
    string calldata baseURI,
    bytes32 postRevealBaseURIHash,
    uint32 maxTokenId,
    address additionalMinter,
    uint256 nonce,
    address payable paymentAddress
  ) external returns (address collection) {
    return
      _createNFTDropCollection(
        name,
        symbol,
        baseURI,
        postRevealBaseURIHash,
        maxTokenId,
        additionalMinter,
        paymentAddress != msg.sender ? paymentAddress : payable(0),
        nonce
      );
  }

  /**
   * @notice Create a new collection contract with a custom payment address derived from the factory.
   * @param paymentAddressFactoryCall The contract call which will return the address to use for payments.
   * Notes:
   *   a) For rest of `params` see `createNFTDropCollection` above.
   */
  function createNFTDropCollectionWithPaymentFactory(
    string calldata name,
    string calldata symbol,
    string calldata baseURI,
    bytes32 postRevealBaseURIHash,
    uint32 maxTokenId,
    address additionalMinter,
    uint256 nonce,
    CallWithoutValue memory paymentAddressFactoryCall
  ) external returns (address collection) {
    return
      _createNFTDropCollection(
        name,
        symbol,
        baseURI,
        postRevealBaseURIHash,
        maxTokenId,
        additionalMinter,
        AddressLibrary.callAndReturnContractAddress(paymentAddressFactoryCall),
        nonce
      );
  }

  function _createNFTDropCollection(
    string calldata name,
    string calldata symbol,
    string calldata baseURI,
    bytes32 postRevealBaseURIHash,
    uint32 maxTokenId,
    address additionalMinter,
    address payable paymentAddress,
    uint256 nonce
  ) private returns (address collection) {
    // This reverts if the NFT was previously created using this implementation version + msg.sender + nonce
    collection = implementationNFTDropCollection.cloneDeterministic(_getSalt(msg.sender, nonce));

    INFTDropCollectionInitializer(collection).initialize(
      payable(msg.sender),
      name,
      symbol,
      baseURI,
      postRevealBaseURIHash,
      maxTokenId,
      additionalMinter,
      paymentAddress
    );

    emit NFTDropCollectionCreated(
      collection,
      msg.sender,
      additionalMinter,
      name,
      symbol,
      baseURI,
      postRevealBaseURIHash,
      maxTokenId,
      paymentAddress,
      versionNFTDropCollection,
      nonce
    );
  }

  /**
   * @notice Returns the address of a collection given the current implementation version, creator, and nonce.
   * This will return the same address whether the collection has already been created or not.
   * @param creator The creator of the collection.
   * @param nonce An arbitrary value used to allow a creator to mint multiple collections.
   * @return collection The address of the collection contract that would be created by this nonce.
   */
  function predictNFTCollectionAddress(address creator, uint256 nonce) external view returns (address collection) {
    collection = implementationNFTCollection.predictDeterministicAddress(_getSalt(creator, nonce));
  }

  /**
   * @notice Returns the address of a NFTDropCollection collection given the current
   * implementation version, creator, and nonce.
   * This will return the same address whether the collection has already been created or not.
   * @param creator The creator of the collection.
   * @param nonce An arbitrary value used to allow a creator to mint multiple collections.
   * @return collection The address of the NFTDropCollection contract
   * that would be created by this nonce.
   */
  function predictNFTDropCollectionAddress(address creator, uint256 nonce) external view returns (address collection) {
    collection = implementationNFTDropCollection.predictDeterministicAddress(_getSalt(creator, nonce));
  }

  function _getSalt(address creator, uint256 nonce) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(creator, nonce));
  }
}
