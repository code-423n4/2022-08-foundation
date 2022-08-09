import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";

export async function setAccountETHBalance(
  address: SignerWithAddress,
  newBalance: BigNumber = ethers.utils.parseEther("1000"),
) {
  const balance = ethers.utils.hexStripZeros(newBalance.toHexString());
  await network.provider.send("hardhat_setBalance", [address.address, balance]);
}
