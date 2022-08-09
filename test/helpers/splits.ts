import { BigNumberish, ContractTransaction, Signer } from "ethers";
import { PercentSplitETH, PercentSplitETH__factory } from "../../src/typechain";
import { Provider } from "@ethersproject/providers";
import { ethers } from "hardhat";

export type Royalty = { recipient: string; percentInBasisPoints: BigNumberish };

export async function getSplitInstance(
  transaction: ContractTransaction,
  signerOrProvider: Signer | Provider,
  royalties?: Royalty[],
): Promise<PercentSplitETH> {
  const receipt = await transaction.wait();
  const log = receipt.events?.find(e => e.event === "PercentSplitCreated");
  let splitAddress = log?.args?.contractAddress;
  if (!splitAddress) {
    if (transaction.to && royalties) {
      const splitFactory = PercentSplitETH__factory.connect(transaction.to, signerOrProvider);
      splitAddress = await splitFactory.getPredictedSplitAddress(royalties);
      if (splitAddress) {
        return PercentSplitETH__factory.connect(splitAddress, signerOrProvider);
      }
    }
    throw new Error("Split address not found");
  }
  return PercentSplitETH__factory.connect(splitAddress, signerOrProvider);
}

export async function getExpectedPercentSplit(
  contracts: { percentSplitFactory: PercentSplitETH },
  shares: Royalty[],
  signerOrProvider?: Signer | Provider,
): Promise<PercentSplitETH> {
  const expectedAddress = await contracts.percentSplitFactory.getPredictedSplitAddress(shares);
  return PercentSplitETH__factory.connect(expectedAddress, signerOrProvider ?? ethers.provider);
}

export async function getSplitShares(address: string): Promise<Royalty[] | undefined> {
  const split = PercentSplitETH__factory.connect(address, ethers.provider);
  try {
    const shares = await split.getShares();
    if (shares.length === 0) {
      return undefined;
    }
    return shares.map(s => ({ recipient: s.recipient, percentInBasisPoints: s.percentInBasisPoints }));
  } catch {
    // Not a valid split contract
    return undefined;
  }
}
