import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { assertAllLogs, EventLog } from "../../helpers/logs";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / mintWithFETH", () => {
  const price = ethers.utils.parseEther("0.42");
  const limitPerAccount = 3;
  const tokenId = 1; // first token
  const count = 3;

  let contracts: TestContracts;
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let tx: ContractTransaction;
  let expectedMintEvents: EventLog[];

  snapshotEach(async () => {
    [deployer, creator, collector] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
    await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(contracts.nftDropCollection.address, price, limitPerAccount);

    // Deposit some FETH into the collector's account
    await contracts.feth.connect(collector).deposit({ value: price.mul(3) });

    // Shared expected mint events
    expectedMintEvents = [
      // Mint tokens
      {
        contract: contracts.nftDropCollection,
        eventName: "Transfer",
        args: [ethers.constants.AddressZero, collector.address, tokenId],
      },
      {
        contract: contracts.nftDropCollection,
        eventName: "Transfer",
        args: [ethers.constants.AddressZero, collector.address, tokenId + 1],
      },
      {
        contract: contracts.nftDropCollection,
        eventName: "Transfer",
        args: [ethers.constants.AddressZero, collector.address, tokenId + 2],
      },
      // Record sale
      {
        contract: contracts.nftDropMarket,
        eventName: "MintFromFixedPriceDrop",
        args: [
          // Collection
          contracts.nftDropCollection.address,
          // Buyer
          collector.address,
          // First tokenId
          tokenId,
          // Count
          count,
          // Total fees 5%
          price.mul(count).mul(5).div(100),
          // Creator rev 95%
          price.mul(count).mul(95).div(100),
        ],
      },
    ];
  });

  it("Cannot mint with insufficient FETH balance", async () => {
    // Withdraw all funds first
    await contracts.feth.connect(collector).withdrawAvailableBalance();

    await expect(
      contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(contracts.nftDropCollection.address, count, ethers.constants.AddressZero),
    )
      .to.be.revertedWithCustomError(contracts.feth, "FETH_Insufficient_Available_Funds")
      .withArgs(0);
  });

  describe("Mint 3 with all FETH", () => {
    beforeEach(async () => {
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(contracts.nftDropCollection.address, count, ethers.constants.AddressZero);
    });

    it("Emits events", async () => {
      await assertAllLogs(tx, [
        {
          contract: contracts.feth,
          eventName: "ETHWithdrawn",
          args: [collector.address, contracts.nftDropMarket.address, price.mul(count)],
        },
        ...expectedMintEvents,
      ]);
    });

    it("Transfers funds as expected", async () => {
      await expect(tx).to.changeEtherBalances(
        [collector, contracts.feth, contracts.nftDropMarket, creator, contracts.treasury],
        [
          // Collector didn't spend any ETH
          0,
          // FETH transferred out all ETH required
          price.mul(-3),
          // Nothing was left in market escrow
          0,
          // Creator received 95% of the price
          price.mul(count).mul(95).div(100),
          // Treasury received 5% of the price
          price.mul(count).mul(5).div(100),
        ],
      );
    });
  });

  describe("Mint 3 with some FETH", () => {
    const amountInFETH = ethers.utils.parseEther("0.1");

    beforeEach(async () => {
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(contracts.nftDropCollection.address, count, ethers.constants.AddressZero, {
          value: price.mul(3).sub(amountInFETH),
        });
    });

    it("Emits events", async () => {
      await assertAllLogs(tx, [
        {
          contract: contracts.feth,
          eventName: "ETHWithdrawn",
          args: [collector.address, contracts.nftDropMarket.address, amountInFETH],
        },
        ...expectedMintEvents,
      ]);
    });

    it("Transfers funds as expected", async () => {
      await expect(tx).to.changeEtherBalances(
        [collector, contracts.feth, contracts.nftDropMarket, creator, contracts.treasury],
        [
          // Collector spent some ETH
          price.mul(3).sub(amountInFETH).mul(-1),
          // FETH transferred out just the delta ETH needed
          amountInFETH.mul(-1),
          // Nothing was left in market escrow
          0,
          // Creator received 95% of the price
          price.mul(count).mul(95).div(100),
          // Treasury received 5% of the price
          price.mul(count).mul(5).div(100),
        ],
      );
    });
  });
});
