import { snapshotEach } from "../../helpers/snapshot";
import { ethers } from "hardhat";
import { FoundationTreasury, NFTCollection, NFTCollectionFactory } from "../../../src/typechain";
import { expect } from "chai";
import { deployAll, deployCollectionImplementationsAndFactory } from "../../helpers/deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getNFTCollection } from "../../helpers/collectionContract";
import { testIpfsPath } from "../../helpers/testData";
import { getMintedTokenId } from "../../helpers/mint";

describe("NFTCollection / selfDestruct", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let rando: SignerWithAddress;
  let nft: NFTCollection;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  let tx: ContractTransaction;
  let treasury: FoundationTreasury;
  const NONCE = 42;

  snapshotEach(async function () {
    [deployer, creator, rando] = await ethers.getSigners();
    ({ treasury } = await deployAll(deployer, creator));
    ({ nftCollectionFactoryV2 } = await deployCollectionImplementationsAndFactory(deployer, treasury));
    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
    nft = await getNFTCollection(tx, creator);
  });

  describe("Self destruct", () => {
    beforeEach(async () => {
      tx = await nft.selfDestruct();
    });

    it("Emits SelfDestruct", async () => {
      await expect(tx).to.emit(nft, "SelfDestruct").withArgs(creator.address);
    });

    it("Address no longer has code", async () => {
      const code = await ethers.provider.getCode(nft.address);
      expect(code).to.equal("0x");
    });

    describe("Re-create the contract", () => {
      let newNft: NFTCollection;

      beforeEach(async () => {
        tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
        newNft = await getNFTCollection(tx, creator);
      });

      it("Has the same address", async () => {
        expect(newNft.address).to.eq(nft.address);
      });

      it("Can mint to the new contract", async () => {
        tx = await newNft.connect(creator).mint(testIpfsPath[0]);
        const tokenId = await getMintedTokenId(tx);
        expect(tokenId).to.eq(1);
      });
    });
  });

  it("Rando cannot self destruct", async () => {
    await expect(nft.connect(rando).selfDestruct()).to.be.revertedWith(
      "SequentialMintCollection: Caller is not creator",
    );
  });

  describe("After minting", () => {
    beforeEach(async () => {
      await nft.mint(testIpfsPath[0]);
    });

    it("Can not self destruct if any NFTs exist", async () => {
      await expect(nft.selfDestruct()).to.be.revertedWith(
        "SequentialMintCollection: Any NFTs minted must be burned first",
      );
    });

    describe("After burning", () => {
      beforeEach(async () => {
        await nft.burn(1);
      });

      describe("Self destruct", () => {
        beforeEach(async () => {
          tx = await nft.selfDestruct();
        });

        it("Emits self destruct", async () => {
          await expect(tx).to.emit(nft, "SelfDestruct").withArgs(creator.address);
        });
      });

      describe("After minting a couple new NFTs", () => {
        beforeEach(async () => {
          await nft.mint(testIpfsPath[0]);
          await nft.mint(testIpfsPath[1]);
        });

        it("Can not self destruct if any NFTs exist", async () => {
          await expect(nft.selfDestruct()).to.be.revertedWith(
            "SequentialMintCollection: Any NFTs minted must be burned first",
          );
        });

        it("Can not create a contract with the same nonce", async () => {
          await expect(
            nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE),
          ).to.be.revertedWith("ERC1167: create2 failed");
        });

        describe("After burning one token", () => {
          beforeEach(async () => {
            await nft.burn(2);
          });

          it("Can not self destruct if any NFTs exist", async () => {
            await expect(nft.selfDestruct()).to.be.revertedWith(
              "SequentialMintCollection: Any NFTs minted must be burned first",
            );
          });

          describe("After burning remaining token", () => {
            beforeEach(async () => {
              await nft.burn(3);
            });

            describe("Self destruct", () => {
              beforeEach(async () => {
                tx = await nft.selfDestruct();
              });

              it("Emits self destruct", async () => {
                await expect(tx).to.emit(nft, "SelfDestruct").withArgs(creator.address);
              });

              describe("Re-create the contract", () => {
                let newNft: NFTCollection;

                beforeEach(async () => {
                  tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
                  newNft = await getNFTCollection(tx, creator);
                });

                it("Has the same address", async () => {
                  expect(newNft.address).to.eq(nft.address);
                });

                it("Can mint to the new contract", async () => {
                  tx = await newNft.connect(creator).mint(testIpfsPath[0]);
                  const tokenId = await getMintedTokenId(tx);
                  expect(tokenId).to.eq(1);
                });
              });
            });
          });
        });
      });
    });
  });
});
