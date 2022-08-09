import { snapshotEach } from "../../helpers/snapshot";
import { ethers } from "hardhat";
import { FoundationTreasury, NFTCollection, NFTCollectionFactory } from "../../../src/typechain";
import { expect } from "chai";
import { deployAll, deployCollectionImplementationsAndFactory } from "../../helpers/deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getNFTCollection } from "../../helpers/collectionContract";
import { testIpfsPath } from "../../helpers/testData";

describe("NFTCollection / totalSupply", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let nft: NFTCollection;
  let tx: ContractTransaction;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  let treasury: FoundationTreasury;
  const NONCE = 42;

  snapshotEach(async function () {
    [deployer, creator] = await ethers.getSigners();
    ({ treasury } = await deployAll(deployer, creator));
    ({ nftCollectionFactoryV2 } = await deployCollectionImplementationsAndFactory(deployer, treasury));
    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
    nft = await getNFTCollection(tx, creator);
  });

  it("Total supply is 0 by default", async () => {
    const totalSupply = await nft.totalSupply();
    expect(totalSupply).to.eq(0);
  });

  describe("After minting", () => {
    beforeEach(async () => {
      await nft.mint(testIpfsPath[0]);
    });

    it("Total supply is 1", async () => {
      const totalSupply = await nft.totalSupply();
      expect(totalSupply).to.eq(1);
    });

    describe("After burning", () => {
      beforeEach(async () => {
        await nft.burn(1);
      });

      it("Total supply is 0 again", async () => {
        const totalSupply = await nft.totalSupply();
        expect(totalSupply).to.eq(0);
      });

      describe("After minting a couple new NFTs", () => {
        beforeEach(async () => {
          await nft.mint(testIpfsPath[0]);
          await nft.mint(testIpfsPath[1]);
        });

        it("Total supply is 2", async () => {
          const totalSupply = await nft.totalSupply();
          expect(totalSupply).to.eq(2);
        });

        describe("After burning one token", () => {
          beforeEach(async () => {
            await nft.burn(2);
          });

          it("Total supply is 1", async () => {
            const totalSupply = await nft.totalSupply();
            expect(totalSupply).to.eq(1);
          });

          describe("After burning remaining token", () => {
            beforeEach(async () => {
              await nft.burn(3);
            });

            it("Total supply is 0", async () => {
              const totalSupply = await nft.totalSupply();
              expect(totalSupply).to.eq(0);
            });

            describe("Re-create the contract", () => {
              beforeEach(async () => {
                await nft.selfDestruct();
                await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
              });

              it("Total supply is 0", async () => {
                const totalSupply = await nft.totalSupply();
                expect(totalSupply).to.eq(0);
              });

              describe("After minting a couple tokens", async () => {
                beforeEach(async () => {
                  await nft.mint(testIpfsPath[0]);
                  await nft.mint(testIpfsPath[1]);
                });

                it("Total supply is 2", async () => {
                  const totalSupply = await nft.totalSupply();
                  expect(totalSupply).to.eq(2);
                });
              });
            });
          });
        });
      });
    });
  });
});
