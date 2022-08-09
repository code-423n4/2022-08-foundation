import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTCollectionFactory } from "../src/typechain";
import { getNFTCollection } from "../test/helpers/collectionContract";
import { TestContracts } from "../test/helpers/deploy";
import { testIpfsPath } from "../test/helpers/testData";
import { story } from "./gas-stories";

describe("Collections", () => {
  let creator: SignerWithAddress;
  let mockMarket: SignerWithAddress;
  let contracts: TestContracts;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  let tx: ContractTransaction;

  beforeEach(async function () {
    [, creator, mockMarket] = await ethers.getSigners();
    contracts = this.contracts;
    nftCollectionFactoryV2 = contracts.nftCollectionFactoryV2!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  });

  it("Create & mint", async () => {
    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("TEST", "TEST", 42);
    await story("NFT", "Factory", "Create Collection", "", tx);
    const collection = await getNFTCollection(tx, creator);

    tx = await collection.connect(creator).mint(testIpfsPath[1]);
    await story("NFT", "Collection", "Mint", "1st mint", tx);

    tx = await collection.connect(creator).mint(testIpfsPath[2]);
    await story("NFT", "Collection", "Mint", "2nd mint", tx);

    tx = await collection.connect(creator).setApprovalForAll(mockMarket.address, true);
    await story("NFT", "Collection", "Approve", "", tx);

    tx = await collection.connect(creator).burn(2);
    await story("NFT", "Collection", "Burn", "with other NFTs", tx);
    tx = await collection.connect(creator).burn(1);
    await story("NFT", "Collection", "Burn", "Last NFT", tx);

    tx = await collection.connect(creator).selfDestruct();
    await story("NFT", "Collection", "Self Destruct", "", tx);
  });

  it("Mint & approve", async () => {
    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("TEST", "TEST", 42);
    const collection = await getNFTCollection(tx, creator);

    tx = await collection.connect(creator).mintAndApprove(testIpfsPath[1], mockMarket.address);
    await story("NFT", "Collection", "Mint", "1st mint & approve", tx);

    tx = await collection.connect(creator).mintAndApprove(testIpfsPath[2], mockMarket.address);
    await story("NFT", "Collection", "Mint", "2nd mint & approve", tx, "approval is redundant");
  });
});
