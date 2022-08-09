import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTDropCollection } from "../../../src/typechain";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropCollection / update", () => {
  const NAME = "NAME";
  const SYMBOL = "SYM";
  const PREREVEAL_URI = "ipfs://foundation.os.token.uri.preveal.content/";
  const BASE_URI = "baseURI";
  const REVEAL_URI_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(BASE_URI));
  const MAX_TOKEN_ID = 100;
  const NONCE = 0;

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let nftDropCollection: NFTDropCollection;
  let contracts: TestContracts;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator, collector] = await ethers.getSigners();
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

  it("Non admin can not update maxTokenId", async () => {
    await expect(nftDropCollection.connect(collector).updateMaxTokenId(10)).to.be.reverted;
  });

  describe("Decrease maxTokenId", () => {
    const newMaxTokenId = 5;

    beforeEach(async () => {
      tx = await nftDropCollection.updateMaxTokenId(newMaxTokenId);
    });

    it("maxTokenId Updated", async () => {
      expect(await nftDropCollection.maxTokenId()).to.eq(newMaxTokenId);
    });

    it("emits MaxTokenIdUpdated", async () => {
      await expect(tx).to.emit(nftDropCollection, "MaxTokenIdUpdated").withArgs(newMaxTokenId);
    });
  });

  it("Fails to increase the maxTokenId", async () => {
    const newMaxTokenId = 500;
    await expect(nftDropCollection.updateMaxTokenId(newMaxTokenId)).to.be.revertedWith(
      "SequentialMintCollection: Max token ID may not increase",
    );
  });

  describe("maxTokenId set to 0", () => {
    it("maxTokenId Updated", async () => {
      await expect(nftDropCollection.updateMaxTokenId(0)).to.be.revertedWith(
        "SequentialMintCollection: Max token ID may not be cleared",
      );
    });
  });

  describe("Once minted", () => {
    beforeEach(async () => {
      await nftDropCollection.mintCountTo(10, collector.address);
    });

    it("can not increase maxTokenId", async () => {
      await expect(nftDropCollection.updateMaxTokenId(MAX_TOKEN_ID + 100)).to.be.revertedWith(
        "SequentialMintCollection: Max token ID may not increase",
      );
    });

    it("can not decrease maxTokenId to less than latestTokenId", async () => {
      await expect(nftDropCollection.updateMaxTokenId(9)).to.be.revertedWith(
        "SequentialMintCollection: Max token ID must be >= last mint",
      );
    });

    describe("Can decrease maxTokenId", () => {
      beforeEach(async () => {
        expect(await nftDropCollection.numberOfTokensAvailableToMint()).to.eq(MAX_TOKEN_ID - 10);
        tx = await nftDropCollection.updateMaxTokenId(10);
      });
      it("maxTokenId Updated", async () => {
        expect(await nftDropCollection.maxTokenId()).to.eq(10);
      });
      it("emits MaxTokenIdUpdated", async () => {
        await expect(tx).to.emit(nftDropCollection, "MaxTokenIdUpdated").withArgs(10);
      });
      it("collection marked as soldOut", async () => {
        expect(await nftDropCollection.numberOfTokensAvailableToMint()).to.eq(0);
      });
    });
  });

  describe("Once minted and burned", () => {
    beforeEach(async () => {
      await nftDropCollection.mintCountTo(10, creator.address);
      for (let tid = 1; tid < 11; ++tid) {
        await nftDropCollection.burn(tid);
      }
    });

    it("can not increase maxTokenId even if totalSupply is 0", async () => {
      await expect(nftDropCollection.updateMaxTokenId(MAX_TOKEN_ID + 100)).to.be.revertedWith(
        "SequentialMintCollection: Max token ID may not increase",
      );
    });
  });
});
