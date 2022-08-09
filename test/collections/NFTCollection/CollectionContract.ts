import { ethers } from "hardhat";
import {
  FoundationTreasury,
  NFTCollection,
  NFTCollection__factory,
  NFTCollectionFactory,
  PercentSplitETH,
} from "../../../src/typechain";
import { expect } from "chai";
import { deployAll, deployCollectionImplementationsAndFactory } from "../../helpers/deploy";
import { testIpfsPath } from "../../helpers/testData";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { snapshotEach } from "../../helpers/snapshot";
import { shouldSupportInterfaces } from "../../../src/testBehaviors";
import { ContractTransaction } from "@ethersproject/contracts";

describe("NFTCollection", () => {
  let deployer: SignerWithAddress;
  let operator: SignerWithAddress;
  let creator: SignerWithAddress;
  let rando: SignerWithAddress;
  let treasury: FoundationTreasury;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  let nft: NFTCollection;
  let percentSplitFactory: PercentSplitETH;
  const NAME = "NAME";
  const SYMBOL = "SYM";
  const NONCE = 0;
  let tx: ContractTransaction;

  snapshotEach(async function () {
    [deployer, operator, creator, rando] = await ethers.getSigners();
    ({ treasury, percentSplitFactory } = await deployAll(deployer, creator));
    await treasury.grantOperator(operator.address);
    ({ nftCollectionFactoryV2 } = await deployCollectionImplementationsAndFactory(deployer, treasury));

    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, SYMBOL, NONCE);
    const nftAddress = await nftCollectionFactoryV2.predictNFTCollectionAddress(creator.address, NONCE);
    nft = NFTCollection__factory.connect(nftAddress, creator);
    await nft.connect(creator).mint(testIpfsPath[0]);

    // Setup test behaviors
    this.nft = nft;
  });

  shouldSupportInterfaces(["GetRoyalties", "TokenCreator", "WithSecondarySales"]);

  it("Collections cannot be initialized other than from the factory", async () => {
    const implementationFactory = new NFTCollection__factory(deployer);
    const implementation = await implementationFactory.deploy(nftCollectionFactoryV2.address);
    await expect(implementation.initialize(deployer.address, NAME, SYMBOL)).to.be.revertedWith(
      "ContractFactory: Caller is not the factory",
    );
  });

  it("Can read that the creator has already minted", async () => {
    expect(await nft.getHasMintedCID(testIpfsPath[0])).to.be.true;
  });

  it("Can read that the creator has not minted other NFTs", async () => {
    expect(await nft.getHasMintedCID(testIpfsPath[1])).to.be.false;
  });

  it("Cannot mint the same hash again", async () => {
    await expect(nft.connect(creator).mint(testIpfsPath[0])).to.be.revertedWith(
      "NFTCollection: NFT was already minted",
    );
  });

  it("getRoyalties", async () => {
    const fees = await nft.getRoyalties(1);
    expect(fees.recipients.length).to.eq(1);
    expect(fees.recipients[0]).to.eq(creator.address);
    expect(fees.feesInBasisPoints.length).to.eq(1);
    expect(fees.feesInBasisPoints[0]).to.eq(1000); // 10% to the creator
  });

  it("baseURI defaults to ipfs://", async () => {
    const uri = await nft.baseURI();
    expect(uri).to.eq("ipfs://");
  });

  it("Cannot mint without a CID", async () => {
    await expect(nft.connect(creator).mint("")).to.be.revertedWith("NFTCollection: tokenCID is required");
  });

  it("tokenURI() reverts for missing tokens", async () => {
    await expect(nft.tokenURI(42)).to.be.revertedWith("NFTCollection: URI query for nonexistent token");
  });

  describe("On transfer NFT", () => {
    beforeEach(async () => {
      await nft.connect(creator).transferFrom(creator.address, rando.address, 1);
    });

    it("owner has changed", async () => {
      expect(await nft.ownerOf(1)).to.eq(rando.address);
    });
  });

  it("Rando cannot change the baseURI", async () => {
    await expect(nft.connect(rando).updateBaseURI("Test")).to.be.revertedWith(
      "SequentialMintCollection: Caller is not creator",
    );
  });

  describe("On change baseURI", async () => {
    const NEW_BASE_URI = "https://foundation.app/ipfs/ipfs/";

    beforeEach(async () => {
      tx = await nft.connect(creator).updateBaseURI(NEW_BASE_URI);
    });

    it("Emits BaseURIUpdated", async () => {
      await expect(tx).to.emit(nft, "BaseURIUpdated").withArgs(NEW_BASE_URI);
    });

    it("The tokenURI has updated", async () => {
      const uri = await nft.tokenURI(1);
      expect(uri).to.eq(NEW_BASE_URI + testIpfsPath[0]);
    });

    describe("BaseURI can be cleared back to the default value", async () => {
      beforeEach(async () => {
        tx = await nft.connect(creator).updateBaseURI("");
      });

      it("Emits BaseURIUpdated", async () => {
        await expect(tx).to.emit(nft, "BaseURIUpdated").withArgs("");
      });

      it("The tokenURI has updated", async () => {
        const uri = await nft.tokenURI(1);
        expect(uri).to.eq("ipfs://" + testIpfsPath[0]);
      });
    });
  });

  describe("Max token ID", () => {
    it("There is no limit on tokenId", async () => {
      for (let i = 1; i <= 50; i++) {
        await nft.connect(creator).mint(testIpfsPath[i]);
      }
    });

    it("Non-creator cannot change the max token ID", async () => {
      await expect(nft.connect(rando).updateMaxTokenId(10)).to.be.revertedWith(
        "SequentialMintCollection: Caller is not creator",
      );
    });

    describe("Set max token ID", () => {
      const MAX_TOKEN_ID = 10;
      beforeEach(async () => {
        tx = await nft.connect(creator).updateMaxTokenId(MAX_TOKEN_ID);
      });

      it("Emits MaxTokenIdUpdated", async () => {
        await expect(tx).to.emit(nft, "MaxTokenIdUpdated").withArgs(MAX_TOKEN_ID);
      });

      it("Minting more than the max fails", async () => {
        for (let i = 1; i < MAX_TOKEN_ID; i++) {
          await nft.connect(creator).mint(testIpfsPath[i]);
        }
        await expect(nft.connect(creator).mint(testIpfsPath[MAX_TOKEN_ID])).to.be.revertedWith(
          "NFTCollection: Max token count has already been minted",
        );
      });

      it("The max cannot be cleared", async () => {
        await expect(nft.connect(creator).updateMaxTokenId(0)).to.be.revertedWith(
          "SequentialMintCollection: Max token ID may not be cleared",
        );
      });

      it("The max cannot be increased", async () => {
        await expect(nft.connect(creator).updateMaxTokenId(MAX_TOKEN_ID + 1)).to.be.revertedWith(
          "SequentialMintCollection: Max token ID may not increase",
        );
      });

      it("Dupe transactions fail", async () => {
        await expect(nft.connect(creator).updateMaxTokenId(MAX_TOKEN_ID)).to.be.revertedWith(
          "SequentialMintCollection: Max token ID may not increase",
        );
      });

      describe("Decrease max tokenID", () => {
        const DECREASED_MAX_TOKEN_ID = MAX_TOKEN_ID - 1;

        beforeEach(async () => {
          tx = await nft.connect(creator).updateMaxTokenId(DECREASED_MAX_TOKEN_ID);
        });

        it("Emits MaxTokenIdUpdated", async () => {
          await expect(tx).to.emit(nft, "MaxTokenIdUpdated").withArgs(DECREASED_MAX_TOKEN_ID);
        });

        describe("Mint up to the max", () => {
          beforeEach(async () => {
            for (let i = 1; i < DECREASED_MAX_TOKEN_ID; i++) {
              await nft.connect(creator).mint(testIpfsPath[i]);
            }
          });

          it("Latest tokenId == max", async () => {
            const current = await nft.latestTokenId();
            expect(current).to.eq(DECREASED_MAX_TOKEN_ID);
          });

          it("Minting more than the max fails", async () => {
            await expect(nft.connect(creator).mint(testIpfsPath[DECREASED_MAX_TOKEN_ID])).to.be.revertedWith(
              "NFTCollection: Max token count has already been minted",
            );
          });

          it("mintAndApprove is also impacted", async () => {
            await expect(
              nft.connect(creator).mintAndApprove(testIpfsPath[DECREASED_MAX_TOKEN_ID], rando.address),
            ).to.be.revertedWith("NFTCollection: Max token count has already been minted");
          });

          it("mintWithCreatorPaymentAddress is also impacted", async () => {
            await expect(
              nft.connect(creator).mintWithCreatorPaymentAddress(testIpfsPath[DECREASED_MAX_TOKEN_ID], rando.address),
            ).to.be.revertedWith("NFTCollection: Max token count has already been minted");
          });

          it("mintWithCreatorPaymentAddressAndApprove is also impacted", async () => {
            await expect(
              nft
                .connect(creator)
                .mintWithCreatorPaymentAddressAndApprove(
                  testIpfsPath[DECREASED_MAX_TOKEN_ID],
                  rando.address,
                  rando.address,
                ),
            ).to.be.revertedWith("NFTCollection: Max token count has already been minted");
          });

          it("mintWithCreatorPaymentFactory is also impacted", async () => {
            const sharesBefore = [
              { recipient: creator.address, percentInBasisPoints: 5000 },
              { recipient: rando.address, percentInBasisPoints: 5000 },
            ];
            const callData = percentSplitFactory.interface.encodeFunctionData("createSplit", [sharesBefore]);
            await expect(
              nft
                .connect(creator)
                .mintWithCreatorPaymentFactory(
                  testIpfsPath[DECREASED_MAX_TOKEN_ID],
                  percentSplitFactory.address,
                  callData,
                ),
            ).to.be.revertedWith("NFTCollection: Max token count has already been minted");
          });

          it("mintWithCreatorPaymentFactoryAndApprove is also impacted", async () => {
            const sharesBefore = [
              { recipient: creator.address, percentInBasisPoints: 5000 },
              { recipient: rando.address, percentInBasisPoints: 5000 },
            ];
            const callData = percentSplitFactory.interface.encodeFunctionData("createSplit", [sharesBefore]);
            await expect(
              nft
                .connect(creator)
                .mintWithCreatorPaymentFactoryAndApprove(
                  testIpfsPath[DECREASED_MAX_TOKEN_ID],
                  percentSplitFactory.address,
                  callData,
                  rando.address,
                ),
            ).to.be.revertedWith("NFTCollection: Max token count has already been minted");
          });

          it("The max cannot decrease below the current token count", async () => {
            await expect(nft.connect(creator).updateMaxTokenId(DECREASED_MAX_TOKEN_ID - 1)).to.be.revertedWith(
              "SequentialMintCollection: Max token ID must be >= last mint",
            );
          });
        });
      });
    });
  });
});
