import { shouldSupportInterfaces } from "../../../src/testBehaviors";
import { deployAll } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropCollection / supportsInterfaces", () => {
  snapshotEach(async function () {
    const contracts = await deployAll();
    this.nft = contracts.nftDropCollection;
  });

  shouldSupportInterfaces(["GetRoyalties", "TokenCreator", "WithSecondarySales", "ERC2981", "NFTDropCollectionMint"]);
});
