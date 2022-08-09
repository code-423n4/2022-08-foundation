// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "forge-std/Test.sol";

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import "../../contracts/NFTDropMarket.sol";
import "../../contracts/FETH.sol";
import "../../contracts/NFTDropCollection.sol";
import "../../contracts/NFTCollectionFactory.sol";
import "../../contracts/mocks/MockTreasury.sol";
import "../../contracts/mocks/RoyaltyRegistry/MockRoyaltyRegistry.sol";

contract TestFixedPriceDrop is Test {
  address admin = address(99);
  address creator = address(1);
  address collector = address(2);

  MockTreasury treasury;
  NFTDropMarket nftDropMarket;
  FETH feth;
  MockRoyaltyRegistry royaltyRegistry;
  NFTCollectionFactory nftCollectionFactory;

  function setUp() public {
    /** Pre-reqs **/
    treasury = new MockTreasury();

    /** Deploy Collection Factory **/
    nftCollectionFactory = new NFTCollectionFactory(address(treasury));
    nftCollectionFactory.initialize(2);
    NFTDropCollection nftDropCollectionTemplate = new NFTDropCollection(address(nftCollectionFactory));
    nftCollectionFactory.adminUpdateNFTDropCollectionImplementation(address(nftDropCollectionTemplate));

    /** Deploy Market **/
    // Deploy the proxy with a placeholder implementation.
    TransparentUpgradeableProxy dropMarketProxy = new TransparentUpgradeableProxy(address(treasury), admin, "");
    feth = new FETH(payable(dropMarketProxy), payable(dropMarketProxy), 24 hours);
    royaltyRegistry = new MockRoyaltyRegistry();

    NFTDropMarket dropMarketImplementation = new NFTDropMarket(
      payable(treasury),
      address(feth),
      address(royaltyRegistry)
    );
    vm.prank(admin);
    dropMarketProxy.upgradeTo(address(dropMarketImplementation));
    nftDropMarket = NFTDropMarket(payable(dropMarketProxy));
    nftDropMarket.initialize();
  }

  function testHappyCase() public {
    /** Create drop collection **/
    uint256 nonce = 42;
    uint32 maxTokenId = 100;
    vm.prank(creator);
    nftCollectionFactory.createNFTDropCollection(
      "Name",
      "SYM",
      "ipfs://sample",
      0x0,
      maxTokenId,
      address(nftDropMarket),
      nonce
    );
    NFTDropCollection nftDropCollection = NFTDropCollection(
      nftCollectionFactory.predictNFTDropCollectionAddress(creator, nonce)
    );

    /** List for sale **/
    uint80 price = 0.5 ether;
    uint16 limitPerAccount = 10;
    vm.prank(creator);
    nftDropMarket.createFixedPriceSale(address(nftDropCollection), price, limitPerAccount);

    /** Mint from sale **/
    uint16 count = 3;
    vm.deal(collector, 999 ether);
    vm.prank(collector);
    nftDropMarket.mintFromFixedPriceSale{ value: price * count }(address(nftDropCollection), count, payable(0));
  }
}
