import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SequentialMintCollectionMock, SequentialMintCollectionMock__factory } from "../../../src/typechain";
import { snapshotEach } from "../../helpers/snapshot";

describe("Collections / Mixins / SequentialMintCollectionInitialize", () => {
  const maxTokenId = 1;

  let mock: SequentialMintCollectionMock;
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;

  snapshotEach(async () => {
    [deployer, creator] = await ethers.getSigners();
    mock = await new SequentialMintCollectionMock__factory(deployer).deploy();
  });

  describe("After init", () => {
    beforeEach(async () => {
      await mock.initializeWithModifier(creator.address, maxTokenId);
    });

    it("Cannot init again", async () => {
      await expect(mock.initializeWithModifier(creator.address, maxTokenId)).to.be.revertedWith(
        "Initializable: contract is already initialized",
      );
    });
  });

  it("Cannot init mixin without top-level modifier", async () => {
    await expect(mock.initializeWithoutModifier(creator.address, maxTokenId)).to.be.revertedWith(
      "Initializable: contract is not initializing",
    );
  });

  it("Cannot init with an empty creator", async () => {
    await expect(mock.initializeWithModifier(ethers.constants.AddressZero, maxTokenId)).to.be.revertedWith(
      "SequentialMintCollection: Creator cannot be the zero address",
    );
  });
});
