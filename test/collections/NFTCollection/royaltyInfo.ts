import { snapshotEach } from "../../helpers/snapshot";
import { ethers } from "hardhat";
import { FoundationTreasury, NFTCollection, NFTCollectionFactory } from "../../../src/typechain";
import { expect } from "chai";
import { deployAll, deployCollectionImplementationsAndFactory } from "../../helpers/deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getNFTCollection } from "../../helpers/collectionContract";
import { shouldSupportInterfaces } from "../../../src/testBehaviors";

describe("NFTCollection / royaltyInfo", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let nft: NFTCollection;
  let tx: ContractTransaction;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  let treasury: FoundationTreasury;
  const NONCE = 42;

  snapshotEach(async function () {
    [deployer, creator] = await ethers.getSigners();
    ({ treasury } = await deployAll(deployer, creator));
    ({ nftCollectionFactoryV2 } = await deployCollectionImplementationsAndFactory(deployer, treasury));
    tx = await nftCollectionFactoryV2.connect(creator).createNFTCollection("NAME", "SYMBOL", NONCE);
    nft = await getNFTCollection(tx, creator);
    this.nft = nft;
  });

  shouldSupportInterfaces(["ERC2981"]);

  it("Sold for nothing.", async () => {
    const fees = await nft.royaltyInfo(1, 0);
    expect(fees.receiver).to.eq(creator.address);
    expect(fees.royaltyAmount).to.eq(0);
  });

  it("Sold for small number.", async () => {
    const fees = await nft.royaltyInfo(1, 1);
    expect(fees.receiver).to.eq(creator.address);
    expect(fees.royaltyAmount).to.eq(0);
  });

  it("Sold for 999.", async () => {
    const fees = await nft.royaltyInfo(1, 999);
    expect(fees.receiver).to.eq(creator.address);
    expect(fees.royaltyAmount).to.eq(99);
  });
});
