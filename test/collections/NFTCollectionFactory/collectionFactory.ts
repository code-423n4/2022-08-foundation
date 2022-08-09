import { expect } from "chai";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTcollectionFactory / collectionFactory", () => {
  let contracts: TestContracts;

  snapshotEach(async () => {
    contracts = await deployAll();
  });

  it("NFTCollection exposes factory address", async () => {
    expect(await contracts.collection.contractFactory()).to.eq(contracts.nftCollectionFactoryV2.address);
  });

  it("NFTDropCollection exposes factory", async () => {
    expect(await contracts.nftDropCollection.contractFactory()).to.eq(contracts.nftCollectionFactoryV2.address);
  });
});
