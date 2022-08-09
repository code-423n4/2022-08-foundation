import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { assertAllLogs } from "../../helpers/logs";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / mintFromFixedPriceSale", () => {
  const price = ethers.utils.parseEther("0.42");
  const limitPerAccount = 3;

  let contracts: TestContracts;
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator, collector] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
    await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(contracts.nftDropCollection.address, price, limitPerAccount);
  });

  describe("Mint 3", () => {
    const tokenId = 1; // first token
    const count = 3;

    beforeEach(async () => {
      tx = await contracts.nftDropMarket
        .connect(collector)
        .mintFromFixedPriceSale(contracts.nftDropCollection.address, count, ethers.constants.AddressZero, {
          value: price.mul(count),
        });
    });

    it("Emits events", async () => {
      await assertAllLogs(tx, [
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
      ]);
    });
  });
});
