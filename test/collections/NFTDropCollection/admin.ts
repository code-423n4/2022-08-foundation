import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropCollection / admin", () => {
  const LIMIT_PER_ACCOUNT = 10;
  const PRICE = ethers.utils.parseEther("1");

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let contracts: TestContracts;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator, collector] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);

    // Create the sale.
    await contracts.nftDropMarket
      .connect(creator)
      .createFixedPriceSale(contracts.nftDropCollection.address, PRICE, LIMIT_PER_ACCOUNT);
  });

  it("Non admin can not mint before drop", async () => {
    await expect(contracts.nftDropCollection.connect(collector).mintCountTo(1, collector.address)).to.be.reverted;
  });

  it("Non admin can not self-destruct", async () => {
    await expect(contracts.nftDropCollection.connect(collector).selfDestruct()).to.be.reverted;
  });

  it("Cannot mint 0 at a time", async () => {
    await expect(contracts.nftDropCollection.mintCountTo(0, collector.address)).to.be.revertedWith(
      "NFTDropCollection: `count` must be greater than 0",
    );
  });

  describe("Admin can mint before drop", () => {
    beforeEach(async () => {
      await contracts.nftDropCollection.mintCountTo(1, collector.address);
    });

    it("Transferred", async () => {
      expect(await contracts.nftDropCollection.ownerOf(1)).to.eq(collector.address);
    });

    it("Can not burn other owners token", async () => {
      await expect(contracts.nftDropCollection.burn(1)).to.be.revertedWith(
        "ERC721: caller is not token owner nor approved",
      );
    });

    it("Collector can not burn token", async () => {
      await expect(contracts.nftDropCollection.connect(collector).burn(1)).to.be.reverted;
    });
  });

  describe("When collection selfDestructed", () => {
    beforeEach(async () => {
      tx = await contracts.nftDropCollection.selfDestruct();
    });

    it("Emits SelfDestruct", async () => {
      await expect(tx).to.emit(contracts.nftDropCollection, "SelfDestruct").withArgs(creator.address);
    });
  });

  describe("When collection gets a mint", () => {
    beforeEach(async () => {
      await contracts.nftDropMarket
        .connect(creator)
        .mintFromFixedPriceSale(contracts.nftDropCollection.address, 1, ethers.constants.AddressZero, {
          value: PRICE,
        });
    });

    it("Can not SelfDestruct", async () => {
      await expect(contracts.nftDropCollection.selfDestruct()).to.be.revertedWith(
        "SequentialMintCollection: Any NFTs minted must be burned first",
      );
    });

    it("admin can burn token", async () => {
      await expect(contracts.nftDropCollection.burn(1))
        .to.emit(contracts.nftDropCollection, "Transfer")
        .withArgs(creator.address, ethers.constants.AddressZero, 1);
    });

    it("totalSupply is correct", async () => {
      expect(await contracts.nftDropCollection.totalSupply()).to.equal(1);
    });

    describe("When token burned", () => {
      beforeEach(async () => {
        await contracts.nftDropCollection.burn(1);
      });
      it("totalSupply is correct", async () => {
        expect(await contracts.nftDropCollection.totalSupply()).to.equal(0);
      });

      it("Can SelfDestruct", async () => {
        await expect(contracts.nftDropCollection.selfDestruct())
          .to.emit(contracts.nftDropCollection, "SelfDestruct")
          .withArgs(creator.address);
      });
    });
  });
});
