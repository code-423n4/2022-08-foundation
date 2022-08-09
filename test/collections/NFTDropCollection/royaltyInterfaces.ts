import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTDropCollection, PercentSplitETH } from "../../../src/typechain";
import {
  getArgsCreateNFTDropCollectionWithPaymentAddress,
  getArgsCreateNFTDropCollectionWithPaymentFactory,
} from "../../fixtures/nftCollectionFactory";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { BASIS_POINTS } from "../../helpers/constants";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";
import { getExpectedPercentSplit } from "../../helpers/splits";

describe("NFTDropCollection / royaltyInterfaces", () => {
  const tokenId = 1;
  const expectedRoyaltyRateBP = 1000; // 10%
  const salePrice = ethers.utils.parseEther("4.20");
  const expectedRoyaltyAmount = salePrice.mul(expectedRoyaltyRateBP).div(BASIS_POINTS);

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let royaltyRecipient: SignerWithAddress;
  let contracts: TestContracts;

  snapshotEach(async function () {
    [deployer, creator, royaltyRecipient] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  describe("Creator recipient", () => {
    it("Declares correct fees", async () => {
      await hasExpectedFees(contracts.nftDropCollection);
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
      await hasExpectedFees(dropWithPaymentAddress, royaltyRecipient);
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
      await hasExpectedFees(dropWithSplit, split);
    });
  });

  async function hasExpectedFees(drop: NFTDropCollection, paymentAddress: { address: string } = creator) {
    // IGetFees
    const fees = await drop.getFeeBps(tokenId);
    expect(fees.length).to.eq(1);
    expect(fees[0]).to.eq(expectedRoyaltyRateBP);

    // getFeeRecipients
    const recipients = await drop.getFeeRecipients(tokenId);
    expect(recipients.length).to.eq(1);
    expect(recipients[0]).to.eq(paymentAddress.address);

    // IGetRoyalties
    const royalties = await drop.getRoyalties(tokenId);
    expect(royalties.recipients.length).to.eq(1);
    expect(royalties.recipients[0]).to.eq(paymentAddress.address);
    expect(royalties.feesInBasisPoints.length).to.eq(1);
    expect(royalties.feesInBasisPoints[0]).to.eq(expectedRoyaltyRateBP);

    // IRoyaltyInfo
    const royaltyInfo = await drop.royaltyInfo(tokenId, salePrice);
    expect(royaltyInfo.receiver).to.eq(paymentAddress.address);
    expect(royaltyInfo.royaltyAmount).to.eq(expectedRoyaltyAmount);

    // ITokenCreator
    expect(await drop.tokenCreator(tokenId)).to.eq(creator.address);

    // Owner
    expect(await drop.owner()).to.eq(creator.address);

    // getPaymentAddress
    expect(await drop.getTokenCreatorPaymentAddress(tokenId)).to.eq(paymentAddress.address);
  }
});
