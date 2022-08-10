import { ethers } from "hardhat";
import {
  FoundationTreasury,
  NFTCollection,
  NFTCollection__factory,
  NFTDropCollection,
  NFTDropCollection__factory,
} from "../../../src/typechain";
import { expect } from "chai";
import {
  deployAll,
  deployCollectionDropFactory,
  deployNFTDropCollectionImplementation,
  TestContracts,
} from "../../helpers/deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { snapshotEach } from "../../helpers/snapshot";
import { ContractTransaction } from "@ethersproject/contracts";
import { INTERFACE_IDS } from "../../../src/testBehaviors";
import { getNFTDropCollection } from "../../helpers/collectionContract";

describe("CollectionDropFactory", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let rando: SignerWithAddress;
  let contracts: TestContracts;
  let nftDropCollection: NFTDropCollection;
  let collectionImplementation: NFTCollection;

  const NAME = "NAME";
  const SYMBOL = "SYM";
  const PREREVEAL_URI = "ipfs://foundation.os.token.uri.preveal.content/";
  const REVEAL_URI_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("baseURI"));
  const MAX_TOKEN_ID = 100;
  const NONCE = 0;
  const VERSION = 1;

  let tx: ContractTransaction;

  snapshotEach(async function () {
    [deployer, creator, rando] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  it("rolesContract was initialized", async () => {
    const address = await contracts.nftCollectionFactoryV2.rolesContract();
    expect(address).to.eq(contracts.treasury.address);
  });

  describe("NFTDropCollection", () => {
    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2
        .connect(creator)
        .createNFTDropCollectionWithPaymentAddress(
          NAME,
          SYMBOL,
          PREREVEAL_URI,
          REVEAL_URI_HASH,
          MAX_TOKEN_ID,
          contracts.nftDropMarket.address,
          NONCE,
          creator.address,
        );
      nftDropCollection = await getNFTDropCollection(tx, creator);
    });

    it("Emits NFTDropCollectionCreated", async () => {
      await expect(tx)
        .to.emit(contracts.nftCollectionFactoryV2, "NFTDropCollectionCreated")
        .withArgs(
          nftDropCollection.address,
          creator.address,
          contracts.nftDropMarket.address,
          NAME,
          SYMBOL,
          PREREVEAL_URI,
          REVEAL_URI_HASH,
          MAX_TOKEN_ID,
          ethers.constants.AddressZero,
          VERSION,
          NONCE,
        );
    });

    it("Cannot create a collection without a symbol", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollectionWithPaymentAddress(
            NAME,
            "",
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE + 1,
            creator.address,
          ),
      ).to.be.revertedWith("NFTDropCollection: `_symbol` must be set");
    });

    it("Can create a collection with a address(0) payment address", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollectionWithPaymentAddress(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE + 1,
            ethers.constants.AddressZero,
          ),
      ).to.not.be.reverted;
    });

    it("Cannot create a collection without a maxTokenId", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            0,
            contracts.nftDropMarket.address,
            NONCE + 1,
          ),
      ).to.be.revertedWith("NFTDropCollection: `_maxTokenId` must be set");
    });

    it("Cannot create a collection without a PreReveal URI", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(
            NAME,
            SYMBOL,
            "",
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE + 1,
          ),
      ).to.be.revertedWith("NFTDropCollection: `_baseURI` must be set");
    });

    it("Cannot create a collection from the same creator+symbol", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE,
          ),
      ).to.be.reverted;
    });

    it("Can create a collection with the same symbol if the msg.sender changes", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(rando)
          .createNFTDropCollection(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE,
          ),
      ).to.not.be.reverted;
    });

    it("Can create a collection with the same symbol if the nonce changes", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            NONCE + 1,
          ),
      ).to.not.be.reverted;
    });

    it("Cannot initialize a collection without same factory", async () => {
      const newImpl = await deployNFTDropCollectionImplementation(deployer, contracts.nftCollectionFactoryV2.address);
      await expect(
        newImpl
          .connect(creator)
          .initialize(
            creator.address,
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            contracts.nftDropMarket.address,
            creator.address,
          ),
      ).to.be.revertedWith("ContractFactory: Caller is not the factory");
    });

    it("Cannot initialize without a valid rolesContract", async () => {
      await expect(deployCollectionDropFactory(deployer, rando as unknown as FoundationTreasury)).to.be.revertedWith(
        "NFTCollectionFactory: RolesContract is not a contract",
      );
    });

    it("implementation has been initialized", async () => {
      expect(await nftDropCollection.name()).to.eq(NAME);
      expect(await nftDropCollection.getTokenCreatorPaymentAddress(1)).to.eq(creator.address);
      expect(await nftDropCollection.symbol()).to.eq(SYMBOL);
      expect(await nftDropCollection.maxTokenId()).to.eq(MAX_TOKEN_ID);
      expect(await nftDropCollection.baseURI()).to.eq(PREREVEAL_URI);
      expect(await nftDropCollection.postRevealBaseURIHash()).to.eq(REVEAL_URI_HASH);
    });

    it("correct ACLs have been set", async () => {
      expect(await nftDropCollection.hasRole(await nftDropCollection.DEFAULT_ADMIN_ROLE(), creator.address)).to.be.true;
      expect(await nftDropCollection.hasRole(await nftDropCollection.MINTER_ROLE(), creator.address)).to.be.false;
      expect(
        await nftDropCollection.hasRole(await nftDropCollection.DEFAULT_ADMIN_ROLE(), contracts.nftDropMarket.address),
      ).to.be.false;
      expect(await nftDropCollection.hasRole(await nftDropCollection.MINTER_ROLE(), contracts.nftDropMarket.address)).to
        .be.true;
    });

    it("correct royaltyInfo has been set", async () => {
      const royalties = await nftDropCollection.royaltyInfo(0, ethers.utils.parseEther("1"));
      expect(royalties[0]).to.eq(creator.address);
      expect(royalties[1]).to.eq(ethers.utils.parseEther("1").div(10));
    });

    it("implementation supports 721 interface", async () => {
      expect(await nftDropCollection.supportsInterface(INTERFACE_IDS["ERC721"])).to.be.true;
    });

    it("Cannot set the implementation to a contract that's already been initialized", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.adminUpdateNFTDropCollectionImplementation(nftDropCollection.address),
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Cannot set the implementation to a contract that's not INFTDropCollectionDropInitializer", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.adminUpdateNFTDropCollectionImplementation(contracts.treasury.address),
      ).to.be.revertedWithoutReason();
    });

    it("Cannot construct the implementation from a non-contract address", async () => {
      await expect(deployNFTDropCollectionImplementation(deployer, deployer.address)).to.be.revertedWith(
        "ContractFactory: Factory is not a contract",
      );
    });

    describe("On createNFTDropCollectionWithPaymentFactory", () => {
      let sharesBefore: {
        recipient: string;
        percentInBasisPoints: number;
      }[];
      beforeEach(async () => {
        sharesBefore = [
          { recipient: creator.address, percentInBasisPoints: 5000 },
          { recipient: rando.address, percentInBasisPoints: 5000 },
        ];
        const callData = contracts.percentSplitFactory.interface.encodeFunctionData("createSplit", [sharesBefore]);
        tx = await contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollectionWithPaymentFactory(
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            deployer.address,
            NONCE + 1,
            { target: contracts.percentSplitFactory.address, callData },
          );
        nftDropCollection = await getNFTDropCollection(tx, creator);
      });

      it("Emits NFTDropCollectionCreated", async () => {
        await expect(tx)
          .to.emit(contracts.nftCollectionFactoryV2, "NFTDropCollectionCreated")
          .withArgs(
            nftDropCollection.address,
            creator.address,
            deployer.address,
            NAME,
            SYMBOL,
            PREREVEAL_URI,
            REVEAL_URI_HASH,
            MAX_TOKEN_ID,
            await contracts.percentSplitFactory.getPredictedSplitAddress(sharesBefore),
            VERSION,
            NONCE + 1,
          );
      });
    });

    it("Version defaults to 1", async () => {
      const version = await contracts.nftCollectionFactoryV2.versionNFTDropCollection();
      expect(version).to.eq(1);
    });

    it("Non-admins cannot change implementation", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(rando)
          .adminUpdateNFTDropCollectionImplementation(nftDropCollection.address),
      ).to.be.revertedWith("NFTCollectionFactory: Caller does not have the Admin role");
    });

    it("implementation must be set to a contract address", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.connect(deployer).adminUpdateNFTDropCollectionImplementation(rando.address),
      ).to.be.revertedWith("NFTCollectionFactory: Implementation is not a contract");
    });

    it("Original implementation has been initialized", async () => {
      const address = await contracts.nftCollectionFactoryV2.implementationNFTDropCollection();
      const template = NFTDropCollection__factory.connect(address, ethers.provider);
      const symbol = await template.symbol();
      expect(symbol).to.eq("NFTDropV1");
      const name = await template.name();
      expect(name).to.eq("NFT Drop Collection Implementation v1");
    });

    describe("On change implementation", () => {
      let newTemplate: NFTDropCollection;

      beforeEach(async () => {
        newTemplate = await deployNFTDropCollectionImplementation(deployer, contracts.nftCollectionFactoryV2.address);
        tx = await contracts.nftCollectionFactoryV2
          .connect(deployer)
          .adminUpdateNFTDropCollectionImplementation(newTemplate.address);
      });

      it("implementation address has changed", async () => {
        const address = await contracts.nftCollectionFactoryV2.implementationNFTDropCollection();
        expect(address).to.eq(newTemplate.address);
      });

      it("Version was incremented", async () => {
        const version = await contracts.nftCollectionFactoryV2.versionNFTDropCollection();
        expect(version).to.eq(2);
      });

      it("Emits ImplementationUpdated", async () => {
        await expect(tx)
          .to.emit(contracts.nftCollectionFactoryV2, "ImplementationNFTDropCollectionUpdated")
          .withArgs(newTemplate.address, 2);
      });

      it("New implementation has been initialized", async () => {
        const symbol = await newTemplate.symbol();
        expect(symbol).to.eq("NFTDropV2");
        const name = await newTemplate.name();
        expect(name).to.eq("NFT Drop Collection Implementation v2");
      });
    });
  });

  describe("[OG]NFTCollection", () => {
    beforeEach(async () => {
      tx = await contracts.nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, SYMBOL, NONCE);
      const collectionAddress = await contracts.nftCollectionFactoryV2.predictNFTCollectionAddress(
        creator.address,
        NONCE,
      );
      collectionImplementation = NFTCollection__factory.connect(collectionAddress, creator);
    });

    it("Emits CollectionCreated", async () => {
      await expect(tx)
        .to.emit(contracts.nftCollectionFactoryV2, "NFTCollectionCreated")
        .withArgs(collectionImplementation.address, creator.address, 1, NAME, SYMBOL, NONCE);
    });

    it("Cannot create a collection without a symbol", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, "", NONCE),
      ).to.be.revertedWith("NFTCollectionFactory: Symbol is required");
    });

    it("Cannot create a collection from the same creator+symbol", async () => {
      await expect(contracts.nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, SYMBOL, NONCE)).to.be
        .reverted;
    });

    it("Cannot create a collection without a symbol", async () => {
      await expect(contracts.nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, "", NONCE + 1)).to.be
        .reverted;
    });

    it("Can create a collection with the same symbol if the creator changes", async () => {
      await expect(contracts.nftCollectionFactoryV2.connect(rando).createNFTCollection(NAME, SYMBOL, NONCE)).not.to.be
        .reverted;
    });

    it("Can create a collection with the same symbol if the nonce changes", async () => {
      await expect(contracts.nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, SYMBOL, NONCE + 1)).not
        .to.be.reverted;
    });

    it("Cannot set the implementation to a contract that's already been initialized", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.adminUpdateNFTCollectionImplementation(collectionImplementation.address),
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Cannot construct the implementation from a non-contract address", async () => {
      const implementationFactory = new NFTCollection__factory(deployer);
      await expect(implementationFactory.deploy(deployer.address)).to.be.revertedWith(
        "ContractFactory: Factory is not a contract",
      );
    });

    it("implementation must be set to a contract address", async () => {
      await expect(
        contracts.nftCollectionFactoryV2.connect(deployer).adminUpdateNFTCollectionImplementation(rando.address),
      ).to.be.revertedWith("NFTCollectionFactory: Implementation is not a contract");
    });

    it("Non-admins cannot change implementation", async () => {
      await expect(
        contracts.nftCollectionFactoryV2
          .connect(rando)
          .adminUpdateNFTCollectionImplementation(nftDropCollection.address),
      ).to.be.revertedWith("NFTCollectionFactory: Caller does not have the Admin role");
    });

    describe("On change implementation", () => {
      let newImplementation: NFTCollection;

      beforeEach(async () => {
        const implementationFactory = new NFTCollection__factory(deployer);
        newImplementation = await implementationFactory.deploy(contracts.nftCollectionFactoryV2.address);
        tx = await contracts.nftCollectionFactoryV2
          .connect(deployer)
          .adminUpdateNFTCollectionImplementation(newImplementation.address);
      });

      it("implementation address has changed", async () => {
        const address = await contracts.nftCollectionFactoryV2.implementationNFTCollection();
        expect(address).to.eq(newImplementation.address);
      });

      it("Version was incremented", async () => {
        const version = await contracts.nftCollectionFactoryV2.versionNFTCollection();
        expect(version).to.eq(2);
      });

      it("Emits ImplementationUpdated", async () => {
        await expect(tx)
          .to.emit(contracts.nftCollectionFactoryV2, "ImplementationNFTCollectionUpdated")
          .withArgs(newImplementation.address, 2);
      });

      it("New implementation has been initialized", async () => {
        const name = await newImplementation.name();
        expect(name).to.eq("NFT Collection Implementation v2");
        const symbol = await newImplementation.symbol();
        expect(symbol).to.eq("NFTv2");
      });
    });
  });
});
