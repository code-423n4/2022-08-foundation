import { BigNumber, providers } from "ethers";
import { ethers } from "hardhat";
import { ONE_HOUR } from "../test/helpers/constants";

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleepUntil(check: () => Promise<boolean>): Promise<void> {
  for (let i = 1; ; i++) {
    if (await check()) return;
    console.log("Waiting for tx to mine...");
    await sleep(1000 * i);
  }
}

// As of 0.5.9 the OZ test helper for time does not work with Hardhat
export async function increaseTime(seconds: number): Promise<void> {
  const provider: providers.JsonRpcProvider = ethers.provider;
  await provider.send("evm_increaseTime", [seconds]);
  await advanceBlock();
}

export async function increaseTimeTo(timestamp: number | BigNumber, shouldAdvanceBlock = true): Promise<void> {
  timestamp = BigNumber.isBigNumber(timestamp) ? timestamp.toNumber() : timestamp;
  const provider: providers.JsonRpcProvider = ethers.provider;
  await provider.send("evm_setNextBlockTimestamp", [timestamp]);
  if (shouldAdvanceBlock) {
    await advanceBlock();
  }
}

export async function increaseTimeToNextHour(): Promise<void> {
  const time = await getBlockTime();
  const timeToMoveTo = Math.ceil((time + 1) / ONE_HOUR) * ONE_HOUR;
  await increaseTimeTo(timeToMoveTo);
}

export async function getBlockTime(block: string | number = "latest"): Promise<number> {
  const provider: providers.JsonRpcProvider = ethers.provider;
  return (await provider.getBlock(block)).timestamp;
}

export async function advanceBlock() {
  const provider: providers.JsonRpcProvider = ethers.provider;
  await provider.send("evm_mine", []);
}
