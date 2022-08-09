import { expect } from "chai";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTCollectionFactory / initializer", () => {
  let contracts: TestContracts;

  snapshotEach(async () => {
    contracts = await deployAll();
  });

  it("Cannot initialize again", async () => {
    await expect(contracts.nftCollectionFactoryV2.initialize(100)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });
});
