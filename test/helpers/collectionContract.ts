import { Provider } from "@ethersproject/abstract-provider";
import { ContractTransaction, Signer } from "ethers";
import { ethers } from "hardhat";
import {
  NFTCollection,
  NFTCollection__factory,
  NFTCollectionFactory__factory,
  NFTDropCollection,
  NFTDropCollection__factory,
} from "../../src/typechain";
import { NFTDropCollectionCreatedEvent } from "../../src/typechain/NFTCollectionFactory";

export async function getNFTCollection(
  tx: ContractTransaction,
  signerOrProvider?: Signer | Provider,
): Promise<NFTCollection> {
  const receipt = await tx.wait();
  const factoryInterface = NFTCollectionFactory__factory.createInterface();
  const log = receipt.logs.find(
    log =>
      log.topics[0] ==
      factoryInterface.getEventTopic(
        factoryInterface.events["NFTCollectionCreated(address,address,uint256,string,string,uint256)"],
      ),
  );
  if (!log) {
    throw new Error("No CollectionCreated event found");
  }
  const event = factoryInterface.parseLog(log);
  const address = event.args.collection;
  return NFTCollection__factory.connect(address, signerOrProvider ?? ethers.provider);
}

export async function getNFTDropCollection(
  tx: ContractTransaction,
  signerOrProvider?: Signer | Provider,
): Promise<NFTDropCollection> {
  const receipt = await tx.wait();
  const event = receipt.events?.find(e => e.event === "NFTDropCollectionCreated") as NFTDropCollectionCreatedEvent;
  const address = event.args.collection;
  return NFTDropCollection__factory.connect(address, signerOrProvider ?? ethers.provider);
}
