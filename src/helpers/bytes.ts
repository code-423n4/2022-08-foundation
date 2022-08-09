import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

/**
 * Returns the byte position of the account's address within an array of bytes.
 */
export function positionOfAddress(bytes: string, account: SignerWithAddress | string): number {
  let address: string;
  if (typeof account === "string") {
    address = account;
  } else {
    address = account.address;
  }
  return bytes.indexOf(address.substr(2).toLowerCase()) / 2 - 1;
}
