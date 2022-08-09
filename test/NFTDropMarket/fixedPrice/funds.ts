import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTDropCollection, NFTDropCollection__factory } from "../../../src/typechain";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { BASIS_POINTS } from "../../helpers/constants";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / Funds", () => {
  const NAME = "NAME";
  const SYMBOL = "SYM";
  const PREREVEAL_URI = "ipfs://foundation.os.token.uri.preveal.content/";
  const BASE_URI = "baseURI";
  const REVEAL_URI_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(BASE_URI));
  const MAX_TOKEN_ID = 100;
  const LIMIT_PER_ACCOUNT = 40;
  const NONCE = 0;
  const PRICE = ethers.utils.parseEther("1");

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let collector2: SignerWithAddress;
  let nftDropCollection: NFTDropCollection;
  let tx: ContractTransaction;
  let contracts: TestContracts;
  let nonReceivable: Contract;

  snapshotEach(async () => {
    [deployer, creator, collector, collector2] = await ethers.getSigners();
    const NonReceivableMock = await ethers.getContractFactory("NonReceivableMock");
    nonReceivable = await NonReceivableMock.deploy();

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

    await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
  });

  describe("Collector buy", () => {
    const collector1BuyCount = 3;

    beforeEach(async () => {
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(nftDropCollection.address, collector1BuyCount, ethers.constants.AddressZero, {
          value: PRICE.mul(collector1BuyCount),
        });
    });

    it("Funds are distributed", async () => {
      await shouldDistributeFundsCorrectly(
        tx,
        PRICE.mul(collector1BuyCount),
        creator,
        contracts.treasury,
        BigNumber.from(500),
      );
    });

    describe("Collector 2 buy with buy referrer", () => {
      const collector2BuyCount = 20;

      beforeEach(async () => {
        tx = await contracts.nftDropMarket
          .connect(collector2)
          .mintFromFixedPriceSale(nftDropCollection.address, collector2BuyCount, collector.address, {
            value: PRICE.mul(collector2BuyCount),
          });
      });

      it("Funds are distributed", async () => {
        // 1% referral fee to collector / 4% to treasury / 95% to creator
        await shouldDistributeFundsCorrectly(
          tx,
          PRICE.mul(collector2BuyCount),
          creator,
          contracts.treasury,
          BigNumber.from(400),
          collector,
          BigNumber.from(100),
        );
      });
    });
  });

  describe("Non receivable referrer", () => {
    const collectorBuyCount = 5;
    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollection(
          NAME,
          SYMBOL,
          PREREVEAL_URI,
          REVEAL_URI_HASH,
          MAX_TOKEN_ID,
          contracts.nftDropMarket.address,
          NONCE + 1,
        );
      nftDropCollection = await getNFTDropCollection(tx, creator);

      await contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(nftDropCollection.address, collectorBuyCount, ethers.constants.AddressZero, {
          value: PRICE.mul(collectorBuyCount),
        });
    });

    it("Funds are distributed", async () => {
      await shouldDistributeFundsCorrectly(
        tx,
        PRICE.mul(collectorBuyCount),
        creator,
        contracts.treasury,
        BigNumber.from(500),
      );
    });

    describe("Buy with buy referrer", () => {
      const collector2BuyCount = 20;

      beforeEach(async () => {
        tx = await contracts.nftDropMarket
          .connect(collector2)
          .mintFromFixedPriceSale(nftDropCollection.address, collector2BuyCount, collector.address, {
            value: PRICE.mul(collector2BuyCount),
          });
      });

      it("Funds are distributed", async () => {
        await shouldDistributeFundsCorrectly(
          tx,
          PRICE.mul(collector2BuyCount),
          creator,
          contracts.treasury,
          BigNumber.from(400),
          collector,
          BigNumber.from(100),
        );
      });
    });

    describe("Buy with non receivable buy referrer", () => {
      const collector2BuyCount = 20;

      beforeEach(async () => {
        tx = await contracts.nftDropMarket
          .connect(collector2)
          .mintFromFixedPriceSale(nftDropCollection.address, collector2BuyCount, nonReceivable.address, {
            value: PRICE.mul(collector2BuyCount),
          });
      });

      it("Funds are distributed", async () => {
        await shouldDistributeFundsCorrectly(
          tx,
          PRICE.mul(collector2BuyCount),
          creator,
          contracts.treasury,
          BigNumber.from(400),
          contracts.feth,
          BigNumber.from(100),
        );
      });
    });
  });

  describe("Non receivable main beneficiary", () => {
    const collectorBuyCount = 5;
    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollectionWithPaymentAddress(
          NAME,
          SYMBOL,
          PREREVEAL_URI,
          REVEAL_URI_HASH,
          MAX_TOKEN_ID,
          contracts.nftDropMarket.address,
          NONCE + 2,
          nonReceivable.address,
        );
      nftDropCollection = await getNFTDropCollection(tx, creator);
      await contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(nftDropCollection.address, collectorBuyCount, ethers.constants.AddressZero, {
          value: PRICE.mul(collectorBuyCount),
        });
    });

    it("Funds are distributed", async () => {
      await shouldDistributeFundsCorrectly(
        tx,
        PRICE.mul(collectorBuyCount),
        contracts.feth,
        contracts.treasury,
        BigNumber.from(500),
      );
    });
  });

  describe("On Create Drop with Split Payment", () => {
    let sharesBefore: {
      recipient: string;
      percentInBasisPoints: number;
    }[];
    const collectorBuyCount = 10;
    beforeEach(async () => {
      sharesBefore = [
        { recipient: creator.address, percentInBasisPoints: 5000 },
        { recipient: deployer.address, percentInBasisPoints: 5000 },
      ];
      const callData = contracts.percentSplitFactory.interface.encodeFunctionData("createSplit", [sharesBefore]);
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollectionWithPaymentFactory(
          NAME,
          SYMBOL,
          PREREVEAL_URI,
          REVEAL_URI_HASH,
          MAX_TOKEN_ID,
          contracts.nftDropMarket.address,
          NONCE + 1,
          { target: contracts.percentSplitFactory.address, callData },
        );
      nftDropCollection = await getNFTDropCollection(tx, creator);

      await contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);

      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(nftDropCollection.address, collectorBuyCount, collector2.address, {
          value: PRICE.mul(collectorBuyCount),
        });
    });

    it("Funds are distributed", async () => {
      const amount = PRICE.mul(collectorBuyCount);
      // 1st recipient of split gets 47.5%
      await expect(tx).to.changeEtherBalance(creator, amount.mul(4750).div(BASIS_POINTS));
      // 2nd recipient of split gets 47.5%
      await expect(tx).to.changeEtherBalance(deployer, amount.mul(4750).div(BASIS_POINTS));
      // referrer gets 1%
      await expect(tx).to.changeEtherBalance(collector2, amount.mul(100).div(BASIS_POINTS));
      // fnd treasury gets 4%
      await expect(tx).to.changeEtherBalance(contracts.treasury, amount.mul(400).div(BASIS_POINTS));
    });
  });
});

export async function shouldDistributeFundsCorrectly(
  tx: ContractTransaction,
  amount: BigNumber,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payee: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sellReferrerToPay: any = undefined,
  sellReferrerBasisPoints: BigNumber | undefined = undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buyReferrerToPay: any = undefined,
  buyReferrerBasisPoints: BigNumber | undefined = undefined,
) {
  let mainPayment = BASIS_POINTS;
  if (sellReferrerBasisPoints && sellReferrerToPay) {
    await expect(tx).to.changeEtherBalance(sellReferrerToPay, amount.mul(sellReferrerBasisPoints).div(BASIS_POINTS));
    mainPayment = mainPayment.sub(sellReferrerBasisPoints);
  }
  if (buyReferrerBasisPoints && buyReferrerToPay) {
    await expect(tx).to.changeEtherBalance(buyReferrerToPay, amount.mul(buyReferrerBasisPoints).div(BASIS_POINTS));
    mainPayment = mainPayment.sub(buyReferrerBasisPoints);
  }
  await expect(tx).to.changeEtherBalance(payee, amount.mul(mainPayment).div(BASIS_POINTS));
}
