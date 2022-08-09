import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTDropCollection } from "../../../src/typechain";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / create", () => {
  const NAME = "NAME";
  const SYMBOL = "SYM";
  const PREREVEAL_URI = "ipfs://foundation.os.token.uri.preveal.content/";
  const BASE_URI = "baseURI";
  const REVEAL_URI_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(BASE_URI));
  const MAX_TOKEN_ID = 5;
  const NONCE = 0;
  const PRICE = ethers.utils.parseEther("1");
  const LIMIT_PER_ACCOUNT = 5;

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let contracts: TestContracts;
  let nftDropCollection: NFTDropCollection;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);

    const tx = await contracts.nftCollectionFactoryV2
      .connect(creator)
      .createNFTDropCollection(
        NAME,
        SYMBOL,
        PREREVEAL_URI,
        REVEAL_URI_HASH,
        MAX_TOKEN_ID,
        contracts.nftDropMarket.address,
        NONCE,
      );
    nftDropCollection = await getNFTDropCollection(tx, creator);
  });

  it("Non-owner can not create FixedPriceSale", async () => {
    await expect(
      contracts.nftDropMarket.createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT),
    ).to.be.revertedWithCustomError(
      contracts.nftDropMarket,
      "NFTDropMarketFixedPriceSale_Only_Callable_By_Collection_Owner",
    );
  });

  it("Can not create FixedPriceSale for contract that does not follow ICollectionMint", async () => {
    await expect(
      contracts.nftDropMarket.createFixedPriceSale(contracts.treasury.address, PRICE, LIMIT_PER_ACCOUNT),
    ).to.be.revertedWithCustomError(
      contracts.nftDropMarket,
      "NFTDropMarketFixedPriceSale_Must_Support_Collection_Mint_Interface",
    );
  });

  it("Can not create FixedPriceSale if mint permissions have not been granted", async () => {
    // Remove minter role
    await nftDropCollection.connect(creator).revokeMinter(contracts.nftDropMarket.address);

    // Then test
    await expect(
      contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT),
    ).to.be.revertedWithCustomError(contracts.nftDropMarket, "NFTDropMarketFixedPriceSale_Mint_Permission_Required");
  });

  it("Can not create FixedPriceSale with 0 limitPerAccount", async () => {
    await expect(
      contracts.nftDropMarket.connect(creator).createFixedPriceSale(nftDropCollection.address, PRICE, 0),
    ).to.be.revertedWithCustomError(
      contracts.nftDropMarket,
      "NFTDropMarketFixedPriceSale_Limit_Per_Account_Must_Be_Set",
    );
  });

  it("SaleConfig returned empty for terms not set drop", async () => {
    const saleConfig = await contracts.nftDropMarket.getFixedPriceSale(nftDropCollection.address);
    expect(saleConfig.seller).to.eq(ethers.constants.AddressZero);
    expect(saleConfig.price).to.eq(0);
    expect(saleConfig.limitPerAccount).to.eq(0);

    // Except for the number available tokens, which reflects how many could be sold on the market
    expect(saleConfig.numberOfTokensAvailableToMint).to.eq(MAX_TOKEN_ID);

    expect(saleConfig.marketCanMint).to.be.true;
  });

  it("SaleConfig returned empty for contract that does not follow ICollectionMint", async () => {
    const saleConfig = await contracts.nftDropMarket.getFixedPriceSale(contracts.treasury.address);
    expect(saleConfig.seller).to.eq(ethers.constants.AddressZero);
    expect(saleConfig.price).to.eq(0);
    expect(saleConfig.limitPerAccount).to.eq(0);
    expect(saleConfig.numberOfTokensAvailableToMint).to.eq(0);

    expect(saleConfig.marketCanMint).to.be.false;
  });

  describe("When creator creates FixedPriceSale", () => {
    beforeEach(async () => {
      tx = await contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
    });

    it("CreateFixedPriceSale emitted", async () => {
      await expect(tx)
        .to.emit(contracts.nftDropMarket, "CreateFixedPriceSale")
        .withArgs(nftDropCollection.address, creator.address, PRICE, LIMIT_PER_ACCOUNT);
    });

    it("SaleConfig Updated", async () => {
      const saleConfig = await contracts.nftDropMarket.getFixedPriceSale(nftDropCollection.address);
      expect(saleConfig.seller).to.eq(creator.address);
      expect(saleConfig.price).to.eq(PRICE);
      expect(saleConfig.limitPerAccount).to.eq(LIMIT_PER_ACCOUNT);
      expect(saleConfig.numberOfTokensAvailableToMint).to.eq(MAX_TOKEN_ID);

      expect(saleConfig.marketCanMint).to.be.true;
    });

    it("Can not re-create sale", async () => {
      await expect(
        contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT),
      ).to.be.revertedWithCustomError(
        contracts.nftDropMarket,
        "NFTDropMarketFixedPriceSale_Must_Not_Have_Pending_Sale",
      );
    });
  });

  describe("If collection sold out", () => {
    beforeEach(async () => {
      tx = await nftDropCollection.connect(creator).mintCountTo(MAX_TOKEN_ID, creator.address);
    });

    it("Can not create sale", async () => {
      await expect(
        contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT),
      ).to.be.revertedWithCustomError(contracts.nftDropMarket, "NFTDropMarketFixedPriceSale_Must_Not_Be_Sold_Out");
    });
  });
});
