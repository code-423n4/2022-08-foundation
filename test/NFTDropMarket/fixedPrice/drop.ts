import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { setAccountETHBalance } from "../../../src/helpers/providerHelpers";
import { NFTDropCollection } from "../../../src/typechain";
import { getArgsCreateNFTDropCollection } from "../../fixtures/nftCollectionFactory";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / Drop", () => {
  const MAX_TOKEN_ID = 45;
  const LIMIT_PER_ACCOUNT = 25;

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let collector2: SignerWithAddress;
  let contracts: TestContracts;
  let nftDropCollection: NFTDropCollection;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator, collector, collector2] = await ethers.getSigners();

    contracts = await deployAll(deployer, creator);

    const tx = await contracts.nftCollectionFactoryV2
      .connect(creator)
      .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { maxTokenId: MAX_TOKEN_ID }));
    nftDropCollection = await getNFTDropCollection(tx, creator);

    // Approve spending FETH
    await contracts.feth.connect(collector).approve(contracts.nftDropMarket.address, ethers.constants.MaxUint256);
  });

  // Check a standard sale
  checkSale(ethers.utils.parseEther("0.42"));

  // Check an airdrop
  checkSale(BigNumber.from(0));

  // Check a large price sale
  describe("Check large price sale", () => {
    const price = ethers.utils.parseEther("1200000"); // 1.2 mil, ~approx the max

    beforeEach(async () => {
      // Ensure more than enough ETH is available
      await setAccountETHBalance(collector, price.mul(2000));
      await setAccountETHBalance(collector2, price.mul(2000));
    });

    checkSale(price);
  });

  function checkSale(price: BigNumber) {
    const saleName = price.eq(BigNumber.from(0)) ? "Airdrop" : "Sale";

    describe(`${saleName} not listed`, () => {
      it("Can not buy from sale", async () => {
        await expect(
          contracts.nftDropMarket
            .connect(collector2)
            .mintFromFixedPriceSale(nftDropCollection.address, 1, ethers.constants.AddressZero, {
              value: price,
            }),
        ).to.be.revertedWithCustomError(
          contracts.nftDropMarket,
          "NFTDropMarketFixedPriceSale_Must_Have_Sale_In_Progress",
        );
      });

      it("Non admin can not start sale", async () => {
        await expect(
          contracts.nftDropMarket
            .connect(collector2)
            .createFixedPriceSale(nftDropCollection.address, price, LIMIT_PER_ACCOUNT),
        ).to.be.revertedWithCustomError(
          contracts.nftDropMarket,
          "NFTDropMarketFixedPriceSale_Only_Callable_By_Collection_Owner",
        );
      });

      it("Admin can start sale", async () => {
        await expect(
          contracts.nftDropMarket
            .connect(creator)
            .createFixedPriceSale(nftDropCollection.address, price, LIMIT_PER_ACCOUNT),
        ).to.not.be.reverted;
      });
    });

    describe(`${saleName} started for ${ethers.utils.formatEther(price)} ETH`, () => {
      beforeEach(async () => {
        tx = await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(nftDropCollection.address, price, LIMIT_PER_ACCOUNT);
      });

      it("Cannot buy 0", async () => {
        await expect(
          contracts.nftDropMarket
            .connect(collector)
            .mintFromFixedPriceSale(nftDropCollection.address, 0, ethers.constants.AddressZero),
        ).to.be.revertedWithCustomError(
          contracts.nftDropMarket,
          "NFTDropMarketFixedPriceSale_Must_Buy_At_Least_One_Token",
        );
      });

      if (!price.eq(BigNumber.from(0))) {
        it("Cannot buy with less than mint cost", async () => {
          await expect(
            contracts.nftDropMarket
              .connect(collector)
              .mintFromFixedPriceSale(nftDropCollection.address, 3, ethers.constants.AddressZero, {
                value: price,
              }),
          )
            .to.be.revertedWithCustomError(contracts.feth, "FETH_Insufficient_Available_Funds")
            .withArgs(0);
        });
      }

      it("Cannot buy with more than mint cost", async () => {
        await expect(
          contracts.nftDropMarket
            .connect(collector)
            .mintFromFixedPriceSale(nftDropCollection.address, 3, ethers.constants.AddressZero, {
              value: price.mul(3).add(1),
            }),
        )
          .to.be.revertedWithCustomError(contracts.nftDropMarket, "NFTDropMarketFixedPriceSale_Too_Much_Value_Provided")
          .withArgs(price.mul(3));
      });

      describe("Collector1 buy", () => {
        const collector1BuyCount = 3;

        beforeEach(async () => {
          tx = await contracts.nftDropMarket
            .connect(collector)
            .mintFromFixedPriceSale(nftDropCollection.address, collector1BuyCount, ethers.constants.AddressZero, {
              value: price.mul(collector1BuyCount),
            });
        });

        it("MintFromFixedPriceDrop emitted", async () => {
          await expect(tx)
            .to.emit(contracts.nftDropMarket, "MintFromFixedPriceDrop")
            .withArgs(
              nftDropCollection.address,
              collector.address,
              1,
              collector1BuyCount,
              price.mul(collector1BuyCount).mul(5).div(100),
              price.mul(collector1BuyCount).mul(95).div(100),
            );
        });

        it("Collector owns the NFTs", async () => {
          for (let tokenId = 1; tokenId <= 3; tokenId++) {
            const owner = await nftDropCollection.ownerOf(tokenId);
            expect(owner).to.eq(collector.address);
          }
        });

        it("Funds are distributed", async () => {
          await expect(tx).to.changeEtherBalance(creator, price.mul(collector1BuyCount).mul(95).div(100));
        });

        it("totalSupply is correct", async () => {
          expect(await nftDropCollection.connect(collector2).totalSupply()).to.equal(collector1BuyCount);
        });

        describe("Collector 2 buy", () => {
          const collector2BuyCount = 20;

          beforeEach(async () => {
            tx = await contracts.nftDropMarket
              .connect(collector2)
              .mintFromFixedPriceSale(nftDropCollection.address, collector2BuyCount, ethers.constants.AddressZero, {
                value: price.mul(collector2BuyCount),
              });
          });

          it("MintFromFixedPriceDrop emitted", async () => {
            await expect(tx)
              .to.emit(contracts.nftDropMarket, "MintFromFixedPriceDrop")
              .withArgs(
                nftDropCollection.address,
                collector2.address,
                collector1BuyCount + 1,
                collector2BuyCount,
                price.mul(collector2BuyCount).mul(5).div(100),
                price.mul(collector2BuyCount).mul(95).div(100),
              );
          });

          it("Collector2 owns the NFTs", async () => {
            for (let tokenId = 4; tokenId < 4 + collector2BuyCount; tokenId++) {
              const owner = await nftDropCollection.ownerOf(tokenId);
              expect(owner).to.eq(collector2.address);
            }
          });

          it("Funds are distributed", async () => {
            await expect(tx).to.changeEtherBalance(creator, price.mul(collector2BuyCount).mul(95).div(100));
          });

          it("totalSupply is correct", async () => {
            expect(await nftDropCollection.connect(collector2).totalSupply()).to.equal(
              collector1BuyCount + collector2BuyCount,
            );
          });

          it("Collector2 can not purchase more than limitPerAccount", async () => {
            await expect(
              contracts.nftDropMarket
                .connect(collector2)
                .mintFromFixedPriceSale(
                  nftDropCollection.address,
                  collector2BuyCount + 1,
                  ethers.constants.AddressZero,
                  { value: price.mul(collector2BuyCount + 1) },
                ),
            )
              .to.be.revertedWithCustomError(
                contracts.nftDropMarket,
                "NFTDropMarketFixedPriceSale_Cannot_Buy_More_Than_Limit",
              )
              .withArgs(LIMIT_PER_ACCOUNT);
          });

          describe("When collection sold out", () => {
            const remainderTokenCount = MAX_TOKEN_ID - collector1BuyCount - collector2BuyCount;

            beforeEach(async () => {
              expect(await nftDropCollection.numberOfTokensAvailableToMint()).to.eq(remainderTokenCount);
              tx = await contracts.nftDropMarket
                .connect(collector)
                .mintFromFixedPriceSale(nftDropCollection.address, remainderTokenCount, ethers.constants.AddressZero, {
                  value: price.mul(remainderTokenCount),
                });
            });

            it("getFixedPriceSale returns defaults when sold out", async () => {
              const saleConfig = await contracts.nftDropMarket.getFixedPriceSale(nftDropCollection.address);
              expect(saleConfig.seller).to.eq(ethers.constants.AddressZero);
              expect(saleConfig.price).to.eq(0);
              expect(saleConfig.limitPerAccount).to.eq(0);
              expect(saleConfig.numberOfTokensAvailableToMint).to.eq(0);

              expect(saleConfig.marketCanMint).to.be.false;
            });

            it("Number available is now 0", async () => {
              expect(await nftDropCollection.numberOfTokensAvailableToMint()).to.eq(0);
            });
          });
        });
      });
    });
  }
});
