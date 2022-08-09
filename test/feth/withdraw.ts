import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { FETH } from "../../src/typechain";
import { deployAll } from "../helpers/deploy";
import { snapshotEach } from "../helpers/snapshot";

describe("FETH / withdraw", function () {
  let feth: FETH;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let operator: SignerWithAddress;
  let tx: ContractTransaction;
  const balance = ethers.utils.parseEther("1");

  snapshotEach(async () => {
    [deployer, user, operator] = await ethers.getSigners();
    ({ feth } = await deployAll(deployer));
    tx = await feth.connect(user).deposit({ value: balance });
  });

  describe("`withdrawAvailableBalance`", () => {
    beforeEach(async () => {
      tx = await feth.connect(user).withdrawAvailableBalance();
    });

    it("Emits ETHWithdrawn", async () => {
      await expect(tx).to.emit(feth, "ETHWithdrawn").withArgs(user.address, user.address, balance);
    });

    it("Transfers ETH", async () => {
      await expect(tx).to.changeEtherBalances([feth, user], [balance.mul(-1), balance]);
    });

    it("Has no FETH remaining", async () => {
      const balanceOf = await feth.balanceOf(user.address);
      expect(balanceOf).to.eq(0);
    });

    it("Cannot withdraw again", async () => {
      await expect(feth.connect(user).withdrawAvailableBalance()).to.be.revertedWithCustomError(
        feth,
        "FETH_No_Funds_To_Withdraw",
      );
    });
  });

  describe("`withdrawFrom`", () => {
    const amount = ethers.utils.parseEther(".25");

    beforeEach(async () => {
      // The operator requires approval
      await feth.connect(user).approve(operator.address, amount);
      tx = await feth.connect(operator).withdrawFrom(user.address, operator.address, amount);
    });

    it("Emits ETHWithdrawn", async () => {
      await expect(tx).to.emit(feth, "ETHWithdrawn").withArgs(user.address, operator.address, amount);
    });

    it("Transfers ETH", async () => {
      await expect(tx).to.changeEtherBalances([feth, operator], [amount.mul(-1), amount]);
    });

    it("Has less FETH available", async () => {
      const balanceOf = await feth.balanceOf(user.address);
      expect(balanceOf).to.eq(balance.sub(amount));
    });
  });
});
