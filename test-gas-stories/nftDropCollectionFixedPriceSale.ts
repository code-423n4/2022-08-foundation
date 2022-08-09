import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTDropCollection } from "../src/typechain";
import { getNFTDropCollection } from "../test/helpers/collectionContract";
import { TestContracts } from "../test/helpers/deploy";
import { story } from "./gas-stories";

describe("nftDropCollectionFixedPriceSale", () => {
  const NAME = "NAME";
  const SYMBOL = "SYM";
  const PREREVEAL_URI = "ipfs://foundation.os.token.uri.preveal.content/";
  const BASE_URI = "baseURI";
  const REVEAL_URI_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(BASE_URI));
  const MAX_TOKEN_ID = 450;
  const LIMIT_PER_ACCOUNT = 25;
  const NONCE = 0;
  const PRICE = ethers.utils.parseEther("1");

  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let collector2: SignerWithAddress;
  let referrer: SignerWithAddress;
  let contracts: TestContracts;
  let nftDropCollection: NFTDropCollection;
  let tx: ContractTransaction;

  beforeEach(async function () {
    [, creator, collector, collector2, referrer] = await ethers.getSigners();
    contracts = this.contracts;
  });

  it("Create & mint", async () => {
    tx = await contracts.nftCollectionFactoryV2
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
    await story("NFT", "Factory", "Create NFTDropCollection", "", tx);

    tx = await contracts.nftCollectionFactoryV2
      .connect(creator)
      .createNFTDropCollection(
        NAME,
        SYMBOL,
        PREREVEAL_URI,
        REVEAL_URI_HASH,
        MAX_TOKEN_ID,
        ethers.constants.AddressZero,
        NONCE + 1,
      );
    await story("NFT", "Factory", "Create NFTDropCollection", "w.o Market as Minter", tx);

    nftDropCollection = await getNFTDropCollection(tx, creator);

    tx = await nftDropCollection.mintCountTo(1, creator.address);
    await story("NFT", "NFTDropCollection", "[Creator] Mint", "1st mint", tx);

    tx = await nftDropCollection.mintCountTo(1, creator.address);
    await story("NFT", "NFTDropCollection", "[Creator] Mint", "2nd mint", tx);

    tx = await nftDropCollection.burn(2);
    await story("NFT", "NFTDropCollection", "Burn", "with other NFTs", tx);
    tx = await nftDropCollection.burn(1);
    await story("NFT", "NFTDropCollection", "Burn", "Last NFT", tx);

    tx = await nftDropCollection.selfDestruct();
    await story("NFT", "NFTDropCollection", "Self Destruct", "", tx);
  });

  it("Update", async () => {
    tx = await contracts.nftCollectionFactoryV2
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

    tx = await nftDropCollection.mintCountTo(2, creator.address);

    const newPreRevealURI = "www.foo.com/pre-reveal.jpeg";
    const newURIHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ipfs://new-uri/"));
    tx = await nftDropCollection.updatePreRevealContent(newPreRevealURI, newURIHash);
    await story("NFT", "NFTDropCollection", "Update", "PreReveal Content", tx);

    tx = await nftDropCollection.updateMaxTokenId(10);
    await story("NFT", "NFTDropCollection", "Update", "MaxTokenId", tx);

    tx = await nftDropCollection.reveal("ipfs://final-base-uri/");
    await story("NFT", "NFTDropCollection", "Update", "Reveal Collection", tx);
  });

  it("FixedPrice Sale", async () => {
    tx = await contracts.nftCollectionFactoryV2
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

    tx = await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
    await story("Market", "NFTDropMarketFixedPriceSale", "createFixedPriceSale", "", tx);

    tx = await contracts.nftDropMarket
      .connect(collector)
      .mintFromFixedPriceSale(nftDropCollection.address, 1, ethers.constants.AddressZero, {
        value: PRICE,
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint", "1st mint", tx);

    tx = await contracts.nftDropMarket
      .connect(collector)
      .mintFromFixedPriceSale(nftDropCollection.address, 1, ethers.constants.AddressZero, {
        value: PRICE,
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint", "2nd mint", tx);

    tx = await contracts.nftDropMarket
      .connect(collector2)
      .mintFromFixedPriceSale(nftDropCollection.address, 1, referrer.address, {
        value: PRICE,
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint", "1st mint w. buy referrer", tx);

    tx = await contracts.nftDropMarket
      .connect(collector2)
      .mintFromFixedPriceSale(nftDropCollection.address, 1, referrer.address, {
        value: PRICE,
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint", "2nd mint w. buy referrer", tx);
  });

  it("Batch Mint", async () => {
    tx = await contracts.nftCollectionFactoryV2
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

    tx = await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);

    tx = await contracts.nftDropMarket
      .connect(collector)
      .mintFromFixedPriceSale(nftDropCollection.address, 10, ethers.constants.AddressZero, {
        value: PRICE.mul(10),
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint Batch", "1st Mint 10", tx);

    tx = await contracts.nftDropMarket
      .connect(collector)
      .mintFromFixedPriceSale(nftDropCollection.address, 10, ethers.constants.AddressZero, {
        value: PRICE.mul(10),
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint Batch", "2nd Mint 10", tx);

    tx = await contracts.nftDropMarket
      .connect(collector2)
      .mintFromFixedPriceSale(nftDropCollection.address, 10, referrer.address, {
        value: PRICE.mul(10),
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint Batch", "1st Mint 10 w. buy referrer", tx);

    tx = await contracts.nftDropMarket
      .connect(collector2)
      .mintFromFixedPriceSale(nftDropCollection.address, 10, referrer.address, {
        value: PRICE.mul(10),
      });
    await story("Market", "NFTDropMarketFixedPriceSale", "[Collector] Mint Batch", "2nd Mint 10 w. buy referrer", tx);
  });
});
