import { BigNumber, ContractTransaction } from "ethers";

export async function getMintedTokenId(transaction: ContractTransaction): Promise<BigNumber> {
  const receipt = await transaction.wait();
  const log = receipt.events?.find(e => e.event === "Minted");
  if (!log?.args) {
    throw new Error("No `Minted` event detected");
  }
  return log.args[1];
}
