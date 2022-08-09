import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { FETH } from "../../src/typechain";
import { deployAll } from "../helpers/deploy";
import { snapshotEach } from "../helpers/snapshot";

describe("FETH / deposit", function () {
  let feth: FETH;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let rando: SignerWithAddress;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, user, rando] = await ethers.getSigners();
    ({ feth } = await deployAll(deployer));
  });

  describe("Direct ETH transfer", () => {
    beforeEach(async () => {
      tx = await user.sendTransaction({ to: feth.address, value: ethers.utils.parseEther("1") });
    });

    it("Emits Transfer", async () => {
      await expect(tx)
        .to.emit(feth, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));
    });

    it("Has available balance", async () => {
      const balance = await feth.balanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Has total balance", async () => {
      const balance = await feth.totalBalanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Transfers ETH", async () => {
      await expect(tx).to.changeEtherBalances(
        [feth, user],
        [ethers.utils.parseEther("1"), ethers.utils.parseEther("-1")],
      );
    });
  });

  describe("`deposit`", () => {
    beforeEach(async () => {
      tx = await feth.connect(user).deposit({ value: ethers.utils.parseEther("1") });
    });

    it("Emits Transfer", async () => {
      await expect(tx)
        .to.emit(feth, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));
    });

    it("Has available balance", async () => {
      const balance = await feth.balanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Has total balance", async () => {
      const balance = await feth.totalBalanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Transfers ETH", async () => {
      await expect(tx).to.changeEtherBalances(
        [feth, user],
        [ethers.utils.parseEther("1"), ethers.utils.parseEther("-1")],
      );
    });
  });

  describe("`depositFor`", () => {
    beforeEach(async () => {
      tx = await feth.connect(rando).depositFor(user.address, { value: ethers.utils.parseEther("1") });
    });

    it("Emits Transfer", async () => {
      await expect(tx)
        .to.emit(feth, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, ethers.utils.parseEther("1"));
    });

    it("Has available balance", async () => {
      const balance = await feth.balanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Has total balance", async () => {
      const balance = await feth.totalBalanceOf(user.address);
      expect(balance).to.eq(ethers.utils.parseEther("1"));
    });

    it("Transfers ETH", async () => {
      await expect(tx).to.changeEtherBalances(
        [feth, rando],
        [ethers.utils.parseEther("1"), ethers.utils.parseEther("-1")],
      );
    });
  });
});
