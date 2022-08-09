import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { getArgsCreateNFTDropCollection } from "../../fixtures/nftCollectionFactory";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropCollection / predictNFTDropCollectionAddress", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let creator2: SignerWithAddress;
  let contracts: TestContracts;
  let tx: ContractTransaction;

  snapshotEach(async () => {
    [deployer, creator, creator2] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  describe("Create with creator / nonce 0", () => {
    const nonce = 0;

    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { nonce }));
    });

    it("Address matches predicted", async () => {
      const predicted = await contracts.nftCollectionFactoryV2.predictNFTDropCollectionAddress(creator.address, nonce);
      const actual = await getNFTDropCollection(tx);
      expect(predicted).to.eq(actual.address);
    });
  });

  describe("Create with creator / nonce 42", () => {
    const nonce = 42;

    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { nonce }));
    });

    it("Address matches predicted", async () => {
      const predicted = await contracts.nftCollectionFactoryV2.predictNFTDropCollectionAddress(creator.address, nonce);
      const actual = await getNFTDropCollection(tx);
      expect(predicted).to.eq(actual.address);
    });
  });

  describe("Create with creator2 / nonce max", () => {
    const nonce = ethers.constants.MaxUint256;

    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator2)
        .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { nonce }));
    });

    it("Address matches predicted", async () => {
      const predicted = await contracts.nftCollectionFactoryV2.predictNFTDropCollectionAddress(creator2.address, nonce);
      const actual = await getNFTDropCollection(tx);
      expect(predicted).to.eq(actual.address);
    });
  });
});
