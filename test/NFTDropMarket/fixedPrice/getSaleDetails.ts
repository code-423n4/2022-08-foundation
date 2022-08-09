import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BasicERC721WithoutOwnerOfRevert,
  BasicERC721WithoutOwnerOfRevert__factory,
  NFTDropCollection,
  NFTDropCollectionUnknownCreatorMock,
  NFTDropCollectionUnknownCreatorMock__factory,
  NFTDropCollectionWithoutAccessControl,
  NFTDropCollectionWithoutAccessControl__factory,
  PercentSplitETH,
} from "../../../src/typechain";
import {
  getArgsCreateNFTDropCollectionWithPaymentAddress,
  getArgsCreateNFTDropCollectionWithPaymentFactory,
} from "../../fixtures/nftCollectionFactory";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { BASIS_POINTS } from "../../helpers/constants";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";
import { getExpectedPercentSplit, getSplitShares } from "../../helpers/splits";

describe("NFTDropMarket / getSaleDetails", () => {
  const tokenId = 1;
  const limitPerAccount = 10;
  const expectedRevenueRateBP = 9500; // 95%
  const salePrice = ethers.utils.parseEther("4.20");
  const expectedCreatorRevenuePerSale = salePrice.mul(expectedRevenueRateBP).div(BASIS_POINTS);

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let royaltyRecipient: SignerWithAddress;
  let collector: SignerWithAddress;
  let buyReferrer: SignerWithAddress;
  let rando: SignerWithAddress;
  let contracts: TestContracts;

  snapshotEach(async function () {
    [deployer, creator, royaltyRecipient, collector, buyReferrer, rando] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  describe("Creator recipient", () => {
    it("Declares correct fees", async () => {
      await hasExpectedFeesAndRecipients(contracts.nftDropCollection, false);
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(contracts.nftDropCollection.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(contracts.nftDropCollection, true);
      });

      it("Declares correct fees w/ referrer", async () => {
        await hasExpectedFeesAndRecipients(contracts.nftDropCollection, true, { buyReferrer });
      });

      describe("After buying max", () => {
        beforeEach(async () => {
          await contracts.nftDropMarket
            .connect(collector)
            .mintFromFixedPriceSale(
              contracts.nftDropCollection.address,
              limitPerAccount,
              ethers.constants.AddressZero,
              { value: salePrice.mul(limitPerAccount) },
            );
        });

        it("Number available is now 0", async () => {
          const available = await contracts.nftDropMarket.getAvailableCountFromFixedPriceSale(
            contracts.nftDropCollection.address,
            collector.address,
          );
          expect(available).to.eq(0);
        });
      });

      describe("After others get close to buying out", () => {
        beforeEach(async () => {
          // Buy max - 1
          for (let id = 1; id < 90; id += limitPerAccount) {
            await contracts.nftDropMarket
              .connect(rando)
              .mintFromFixedPriceSale(
                contracts.nftDropCollection.address,
                limitPerAccount,
                ethers.constants.AddressZero,
                { value: salePrice.mul(limitPerAccount) },
              );
            // Transfer out so we can keep buying
            for (let i = 0; i < limitPerAccount; i++) {
              await contracts.nftDropCollection.connect(rando).transferFrom(rando.address, deployer.address, id + i);
            }
          }

          // Buy one more
          await contracts.nftDropMarket
            .connect(rando)
            .mintFromFixedPriceSale(contracts.nftDropCollection.address, 1, ethers.constants.AddressZero, {
              value: salePrice,
            });
        });

        it("Number available for a user is now < limitPerAccount", async () => {
          const available = await contracts.nftDropMarket.getAvailableCountFromFixedPriceSale(
            contracts.nftDropCollection.address,
            collector.address,
          );
          expect(available).to.eq(limitPerAccount - 1);
        });
      });
    });
  });

  describe("Payment address recipient", () => {
    let dropWithPaymentAddress: NFTDropCollection;

    beforeEach(async () => {
      const tx = await contracts.nftCollectionFactoryV2.connect(creator).createNFTDropCollectionWithPaymentAddress(
        ...getArgsCreateNFTDropCollectionWithPaymentAddress(contracts, {
          paymentAddress: royaltyRecipient.address,
        }),
      );
      dropWithPaymentAddress = await getNFTDropCollection(tx);
    });

    it("Declares correct fees", async () => {
      await hasExpectedFeesAndRecipients(dropWithPaymentAddress, false, { paymentAddress: royaltyRecipient });
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(dropWithPaymentAddress.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true, { paymentAddress: royaltyRecipient });
      });

      it("Declares correct fees w/ referrer", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true, {
          paymentAddress: royaltyRecipient,
          buyReferrer,
        });
      });
    });
  });

  describe("Payment address set to creator", () => {
    let dropWithPaymentAddress: NFTDropCollection;

    beforeEach(async () => {
      const tx = await contracts.nftCollectionFactoryV2.connect(creator).createNFTDropCollectionWithPaymentAddress(
        ...getArgsCreateNFTDropCollectionWithPaymentAddress(contracts, {
          paymentAddress: creator.address,
        }),
      );
      dropWithPaymentAddress = await getNFTDropCollection(tx);
    });

    it("Declares correct fees", async () => {
      await hasExpectedFeesAndRecipients(dropWithPaymentAddress, false);
    });

    it("Declares correct fees w/ payment", async () => {
      await hasExpectedFeesAndRecipients(dropWithPaymentAddress, false, { paymentAddress: creator });
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(dropWithPaymentAddress.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true);
      });

      it("Declares correct fees w/ payment", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true, { paymentAddress: creator });
      });

      it("Declares correct fees w/ referrer", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true, { buyReferrer });
      });

      it("Declares correct fees w/ payment & referrer", async () => {
        await hasExpectedFeesAndRecipients(dropWithPaymentAddress, true, { paymentAddress: creator, buyReferrer });
      });
    });
  });

  describe("Split recipient", () => {
    let dropWithSplit: NFTDropCollection;
    let split: PercentSplitETH;

    beforeEach(async () => {
      const shares = [
        { recipient: creator.address, percentInBasisPoints: 9000 },
        { recipient: royaltyRecipient.address, percentInBasisPoints: 1000 },
      ];
      split = await getExpectedPercentSplit(contracts, shares);
      const tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollectionWithPaymentFactory(
          ...getArgsCreateNFTDropCollectionWithPaymentFactory(contracts, { shares }),
        );
      dropWithSplit = await getNFTDropCollection(tx);
    });

    it("Declares correct fees", async () => {
      await hasExpectedFeesAndRecipients(dropWithSplit, false, { paymentAddress: split });
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(dropWithSplit.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(dropWithSplit, true, { paymentAddress: split });
      });
    });
  });

  describe("Invalid collection", () => {
    it("Assumes fees for an invalid contract", async () => {
      // The behavior here is debatable, the contract is making a best effort guess for an unlisted collection.
      // Address is zero because the fee getter cannot detect the owner / seller
      await hasExpectedFeesAndRecipients(contracts.treasury, false, {
        paymentAddress: { address: ethers.constants.AddressZero },
        mintNotSupported: true, // no tokens can be minted since the required API is not implemented
      });
    });

    it("Fails to get fees for an EOA", async () => {
      // This may be relevant to retrieve approximate data for a collection that has not minted yet
      // However this currently reverts because an EOA returns success with no data on the .ownerOf call
      await expect(contracts.nftDropMarket.getFeesAndRecipients(rando.address, tokenId, salePrice)).to.be.reverted;
    });
  });

  describe("Unknown creator drop", () => {
    let mockDrop: NFTDropCollectionUnknownCreatorMock;

    beforeEach(async () => {
      mockDrop = await new NFTDropCollectionUnknownCreatorMock__factory(creator).deploy(
        contracts.nftDropMarket.address,
      );
    });

    it("Declares correct fees", async () => {
      // Address is zero because the fee getter cannot detect the owner / seller
      await hasExpectedFeesAndRecipients(mockDrop, false, {
        paymentAddress: { address: ethers.constants.AddressZero },
      });
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(mockDrop.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(mockDrop, true);
      });
    });
  });

  describe("Drop without access control", () => {
    let mockDrop: NFTDropCollectionWithoutAccessControl;

    beforeEach(async () => {
      mockDrop = await new NFTDropCollectionWithoutAccessControl__factory(creator).deploy();
    });

    it("Declares correct fees", async () => {
      // Address is zero because the fee getter cannot detect the owner / seller
      await hasExpectedFeesAndRecipients(mockDrop, false, {
        paymentAddress: { address: ethers.constants.AddressZero },
        mintNotSupported: true,
      });
    });

    it("Listing reverts", async () => {
      await expect(
        contracts.nftDropMarket.connect(creator).createFixedPriceSale(mockDrop.address, salePrice, limitPerAccount),
      ).to.be.reverted;
    });
  });

  describe("No revert .ownerOf", () => {
    let mockDrop: BasicERC721WithoutOwnerOfRevert;

    beforeEach(async () => {
      mockDrop = await new BasicERC721WithoutOwnerOfRevert__factory(creator).deploy();
      await mockDrop.grantRole(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")),
        contracts.nftDropMarket.address,
      );
    });

    it("Declares correct fees", async () => {
      // Address is zero because the fee getter cannot detect the owner / seller
      await hasExpectedFeesAndRecipients(mockDrop, false, {
        paymentAddress: { address: ethers.constants.AddressZero },
      });
    });

    describe("After listing", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(creator)
          .createFixedPriceSale(mockDrop.address, salePrice, limitPerAccount);
      });

      it("Declares correct fees", async () => {
        await hasExpectedFeesAndRecipients(mockDrop, true);
      });
    });

    describe("After minted", () => {
      beforeEach(async () => {
        await mockDrop.mint(creator.address, tokenId);
      });

      it("getFees reverts after the NFT has been minted", async () => {
        await expect(
          contracts.nftDropMarket.getFeesAndRecipients(mockDrop.address, tokenId, salePrice),
        ).to.be.revertedWithCustomError(contracts.nftDropMarket, "NFTDropMarket_NFT_Already_Minted");
      });
    });
  });

  async function hasExpectedFeesAndRecipients(
    drop: { address: string },
    isListed: boolean,
    options?: { paymentAddress?: { address: string }; buyReferrer?: SignerWithAddress; mintNotSupported?: boolean },
  ) {
    const totalFeesPerSale = salePrice.mul(5).div(100); // 5% of price per NFT

    /** Test getFixedPriceSale **/
    const saleDetails = await contracts.nftDropMarket.getFixedPriceSale(drop.address);
    if (isListed) {
      expect(saleDetails.seller).to.eq(creator.address);
      expect(saleDetails.price).to.eq(salePrice);
      expect(saleDetails.limitPerAccount).to.eq(limitPerAccount);
    } else {
      expect(saleDetails.seller).to.eq(ethers.constants.AddressZero);
      expect(saleDetails.price).to.eq(0);
      expect(saleDetails.limitPerAccount).to.eq(0);
    }
    expect(saleDetails.numberOfTokensAvailableToMint).to.eq(options?.mintNotSupported ? 0 : 100);
    expect(saleDetails.marketCanMint).to.eq(options?.mintNotSupported ? false : true);

    /** Test getAvailableCountFromFixedPriceSale **/
    const available = await contracts.nftDropMarket.getAvailableCountFromFixedPriceSale(
      drop.address,
      collector.address,
    );
    expect(available).to.eq(!isListed || options?.mintNotSupported ? 0 : limitPerAccount);

    /** Test getFeesAndRecipients **/
    const feesAndRecipients = await contracts.nftDropMarket.getFeesAndRecipients(drop.address, tokenId, salePrice);
    expect(feesAndRecipients.totalFees).to.eq(totalFeesPerSale);
    expect(feesAndRecipients.creatorRev).to.eq(expectedCreatorRevenuePerSale);
    expect(feesAndRecipients.creatorRecipients.length).to.eq(1);
    expect(feesAndRecipients.creatorRecipients[0]).to.eq((options?.paymentAddress ?? creator).address);
    expect(feesAndRecipients.creatorShares.length).to.eq(1);
    expect(feesAndRecipients.creatorShares[0]).to.eq(expectedCreatorRevenuePerSale);
    expect(feesAndRecipients.sellerRev).to.eq(0);
    if (isListed) {
      expect(feesAndRecipients.seller).to.eq(creator.address);
    } else {
      expect(feesAndRecipients.seller).to.eq(ethers.constants.AddressZero);
    }

    /** Test getSellerOf **/
    if (isListed) {
      const seller = await contracts.nftDropMarket.getSellerOf(drop.address, tokenId);
      expect(seller).to.eq(creator.address);
    } else {
      const seller = await contracts.nftDropMarket.getSellerOf(drop.address, tokenId);
      expect(seller).to.eq(ethers.constants.AddressZero);
    }

    if (isListed) {
      /** Sell and confirm event and actual payouts match **/
      const count = 3; // Using a non-zero number to help confirm multiplication when compared to fees which assumes 1
      const value = salePrice.mul(count);
      const tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(drop.address, count, options?.buyReferrer?.address ?? ethers.constants.AddressZero, {
          value,
        });

      /** Test event **/
      await expect(tx)
        .to.emit(contracts.nftDropMarket, "MintFromFixedPriceDrop")
        .withArgs(
          drop.address,
          collector.address,
          tokenId,
          count,
          totalFeesPerSale.mul(count),
          expectedCreatorRevenuePerSale.mul(count),
        );

      /** Check revenue distribution **/
      // Confirm payment and escrow
      await expect(tx).to.changeEtherBalances(
        [collector, contracts.nftDropMarket],
        [
          // Collector paid the full price
          value.mul(-1),
          // Nothing was left in escrow
          0,
        ],
      );
      // Confirm creator payment
      if (options?.paymentAddress) {
        const split = await getSplitShares(options.paymentAddress.address);

        if (split) {
          // Revenue was split
          const recipients = [];
          const revenues = [];
          for (const share of split) {
            recipients.push(share.recipient);
            revenues.push(expectedCreatorRevenuePerSale.mul(count).mul(share.percentInBasisPoints).div(BASIS_POINTS));
          }
          await expect(tx).to.changeEtherBalances(recipients, revenues);
        } else {
          // This is a standard payment address
          await expect(tx).to.changeEtherBalances(
            [options.paymentAddress.address],
            [
              // Funds went to the payment address
              expectedCreatorRevenuePerSale.mul(count),
            ],
          );
        }
      } else {
        // All revenue went to the creator
        await expect(tx).to.changeEtherBalance(creator, expectedCreatorRevenuePerSale.mul(count));
      }
      // Confirm treasury & referrer payment
      if (options?.buyReferrer) {
        await expect(tx).to.changeEtherBalances(
          [contracts.treasury, options.buyReferrer],
          [
            // 80% of fees went to the treasury
            totalFeesPerSale.mul(count).mul(80).div(100),
            // 20% of fees went to the referrer
            totalFeesPerSale.mul(count).mul(20).div(100),
          ],
        );
      } else {
        await expect(tx).to.changeEtherBalance(contracts.treasury, totalFeesPerSale.mul(count));
      }

      /** Test getFixedPriceSale after a sale **/
      const saleDetails = await contracts.nftDropMarket.getFixedPriceSale(drop.address);
      expect(saleDetails.seller).to.eq(creator.address);
      expect(saleDetails.price).to.eq(salePrice);
      expect(saleDetails.limitPerAccount).to.eq(limitPerAccount);
      expect(saleDetails.numberOfTokensAvailableToMint).to.eq(100 - 3); // 3 tokens were minted
      expect(saleDetails.marketCanMint).to.eq(true);

      /** Test getAvailableCountFromFixedPriceSale after a sale **/
      const available = await contracts.nftDropMarket.getAvailableCountFromFixedPriceSale(
        drop.address,
        collector.address,
      );
      expect(available).to.eq(options?.mintNotSupported ? 0 : limitPerAccount - 3);

      /** Test getFeesAndRecipients after a sale **/
      await expect(
        contracts.nftDropMarket.getFeesAndRecipients(drop.address, tokenId, salePrice),
      ).to.be.revertedWithCustomError(contracts.nftDropMarket, "NFTDropMarket_NFT_Already_Minted");
    }

    /** Test getSellerOf after minting **/
    const seller = await contracts.nftDropMarket.getSellerOf(drop.address, tokenId);
    expect(seller).to.eq(ethers.constants.AddressZero);
  }
});
