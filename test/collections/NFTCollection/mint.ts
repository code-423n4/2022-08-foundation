import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";
import { testIpfsPath } from "../../helpers/testData";

describe("NFTCollection / mint", () => {
  let contracts: TestContracts;
  let deployer, creator, rando: SignerWithAddress;

  snapshotEach(async () => {
    [deployer, creator, rando] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  it("Rando cannot mint from the collection", async () => {
    await expect(contracts.collection.connect(rando).mint(testIpfsPath[0])).to.be.revertedWith(
      "SequentialMintCollection: Caller is not creator",
    );
  });
});
