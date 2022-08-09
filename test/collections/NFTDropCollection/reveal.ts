import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { formatBytes32String } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { NFTDropCollection } from "../../../src/typechain";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropCollection / reveal", () => {
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
  let contracts: TestContracts;
  let nftDropCollection: NFTDropCollection;
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

  describe("Mint pre-reveal", () => {
    beforeEach(async () => {
      // Mint tokens [1-10]
      for (let i = 0; i < 10; i++) {
        await nftDropCollection.connect(creator).mintCountTo(1, collector.address);
      }
    });

    it("Get pre-reveal tokenURI", async () => {
      const uri = await nftDropCollection.tokenURI(5);
      expect(uri).to.eq(PREREVEAL_URI + "5.json");
    });

    it("Can reveal with mismatch URI", async () => {
      await expect(nftDropCollection.connect(creator).reveal("ipfs://some.wrong.uri"))
        .to.emit(nftDropCollection, "URIUpdated")
        .withArgs("ipfs://some.wrong.uri", formatBytes32String(""));
    });

    it("Can not mint more than max token count", async () => {
      await expect(nftDropCollection.connect(creator).mintCountTo(91, collector.address)).to.be.revertedWith(
        "NFTDropCollection: Exceeds max tokenId",
      );
    });

    it("Can not reveal with empty URI", async () => {
      await expect(nftDropCollection.connect(creator).reveal("")).to.be.revertedWith(
        "NFTDropCollection: `_baseURI` must be set",
      );
    });

    it("Can not reveal using updatePreRevealContent", async () => {
      const newURI = "ipfs://new-uri";
      await expect(
        nftDropCollection.connect(creator).updatePreRevealContent(newURI, formatBytes32String("")),
      ).to.be.revertedWith("NFTDropCollection: use `reveal` instead");
    });

    it("Can not updatePreRevealContent with empty baseURI", async () => {
      const newURI = "ipfs://new-uri";
      await expect(
        nftDropCollection.connect(creator).updatePreRevealContent("", formatBytes32String(newURI)),
      ).to.be.revertedWith("NFTDropCollection: `_baseURI` must be set");
    });

    it("Non admin can not updatePreRevealContent", async () => {
      const newURI = "ipfs://new-uri";
      await expect(
        nftDropCollection.connect(collector).updatePreRevealContent("some-string", formatBytes32String(newURI)),
      ).to.be.reverted;
    });

    it("Non admin can not reveal", async () => {
      await expect(nftDropCollection.connect(collector).reveal(BASE_URI)).to.be.reverted;
    });

    describe("Admin Reveal", () => {
      beforeEach(async () => {
        tx = await nftDropCollection.connect(creator).reveal(BASE_URI);
      });

      it("baseURIHash removed", async () => {
        expect(await nftDropCollection.postRevealBaseURIHash()).to.eq(formatBytes32String(""));
      });

      it("isRevealed set to True", async () => {
        expect(await nftDropCollection.isRevealed()).to.be.true;
      });

      it("emits URIUpdated", async () => {
        await expect(tx).to.emit(nftDropCollection, "URIUpdated").withArgs(BASE_URI, formatBytes32String(""));
      });

      it("Get post-reveal tokenURI", async () => {
        const uri = await nftDropCollection.tokenURI(5);
        expect(uri).to.eq(BASE_URI + "5.json");
      });

      it("Can not get non-existant tokenURI", async () => {
        await expect(nftDropCollection.tokenURI(500)).to.be.revertedWith("ERC721: invalid token ID");
      });

      it("Can not reveal again", async () => {
        await expect(nftDropCollection.connect(creator).reveal(BASE_URI)).to.be.revertedWith(
          "NFTDropCollection: Already revealed",
        );
      });

      it("Can not update pre-reveal content", async () => {
        const newURI = "ipfs://new-uri";
        await expect(
          nftDropCollection
            .connect(creator)
            .updatePreRevealContent(BASE_URI, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newURI))),
        ).to.be.revertedWith("NFTDropCollection: Already revealed");
      });
    });

    describe("updatePreRevealContent", () => {
      const newURI = "ipfs://new-uri";
      const newURIHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newURI));
      beforeEach(async () => {
        tx = await nftDropCollection
          .connect(creator)
          .updatePreRevealContent(await nftDropCollection.baseURI(), newURIHash);
      });

      it("Get post-reveal new tokenURI", async () => {
        await nftDropCollection.connect(creator).reveal("ipfs://new-uri");
        const uri = await nftDropCollection.tokenURI(5);
        expect(uri).to.eq("ipfs://new-uri" + "5.json");
      });

      it("URI Updated emitted", async () => {
        await expect(tx)
          .to.emit(nftDropCollection, "URIUpdated")
          .withArgs(PREREVEAL_URI, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newURI)));
      });
    });
  });
});
