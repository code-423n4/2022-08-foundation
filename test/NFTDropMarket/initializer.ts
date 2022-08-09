import { expect } from "chai";
import { deployAll, TestContracts } from "../helpers/deploy";
import { snapshotEach } from "../helpers/snapshot";

describe("NFTDropMarket / initializer", () => {
  let contracts: TestContracts;

  snapshotEach(async () => {
    contracts = await deployAll();
  });

  it("Cannot initialize again", async () => {
    await expect(contracts.nftDropMarket.initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });
});
