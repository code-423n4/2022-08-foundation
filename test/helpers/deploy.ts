import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import {
  EmptyMockContract__factory,
  FETH,
  FETH__factory,
  FoundationTreasury,
  FoundationTreasury__factory,
  MockNFT,
  MockNFT__factory,
  NFTCollection,
  NFTCollectionFactory,
  NFTCollectionFactory__factory,
  NFTCollection__factory,
  NFTDropCollection,
  NFTDropCollection__factory,
  NFTDropMarket,
  NFTDropMarket__factory,
  PercentSplitETH,
  PercentSplitETH__factory,
  RoyaltyRegistry,
  RoyaltyRegistry__factory,
  WETH9,
  WETH9__factory,
} from "../../src/typechain";
import { getArgsCreateNFTDropCollection } from "../fixtures/nftCollectionFactory";
import { getNFTCollection, getNFTDropCollection } from "./collectionContract";
import { ONE_DAY } from "./constants";

export type TestContracts = {
  treasury: FoundationTreasury;
  feth: FETH;
  royaltyRegistry: RoyaltyRegistry;
  nft: MockNFT;
  nftDropMarket: NFTDropMarket;
  nftCollectionFactoryV2: NFTCollectionFactory;
  percentSplitFactory: PercentSplitETH;

  // sample collections for testing
  collection: NFTCollection;
  nftDropCollection: NFTDropCollection;
};

export async function deployAll(deployer?: SignerWithAddress, creator?: SignerWithAddress): Promise<TestContracts> {
  if (!deployer) {
    [deployer] = await ethers.getSigners();
  }
  upgrades.silenceWarnings();
  const treasury = await deployTreasury({ deployer });
  const royaltyRegistry = await deployRoyaltyRegistry(deployer);
  const { feth, nftDropMarket } = await deployMarketAndFETH({ deployer, treasury, royaltyRegistry });
  const nft = await deployMockNFT(creator ?? deployer);
  const nftCollectionFactoryV2 = await deployCollectionFactory(deployer, treasury);
  const percentSplitFactory = await deployPercentSplit(deployer, treasury);

  // Create collection contracts for tests which are not concerned with the particulars, other than the creator.
  let tx = await nftCollectionFactoryV2.connect(creator || deployer).createNFTCollection("NAME", "SYMBOL", 987654321);
  const collection = await getNFTCollection(tx, creator || deployer);
  tx = await nftCollectionFactoryV2
    .connect(creator || deployer)
    .createNFTDropCollection(...getArgsCreateNFTDropCollection({ nftDropMarket }));
  const nftDropCollection = await getNFTDropCollection(tx, creator || deployer);

  return {
    treasury,
    feth,
    royaltyRegistry,
    nft,
    nftDropMarket,
    nftCollectionFactoryV2,
    percentSplitFactory,
    collection,
    nftDropCollection,
  };
}

export async function deployTreasury({
  deployer,
  defaultAdmin,
  defaultOperator,
}: {
  deployer: SignerWithAddress;
  defaultAdmin?: SignerWithAddress;
  defaultOperator?: SignerWithAddress;
}): Promise<FoundationTreasury> {
  const Treasury = new FoundationTreasury__factory(deployer);
  const admin = defaultAdmin ?? deployer;
  const treasury = (await upgrades.deployProxy(Treasury, [admin.address])) as FoundationTreasury;
  const operator = defaultOperator ?? admin;
  await treasury.connect(admin).grantOperator(operator.address);

  return treasury;
}

export async function deployRoyaltyRegistry(deployer: SignerWithAddress): Promise<RoyaltyRegistry> {
  // Manually deploy proxy and set implementation, deploy helpers assume building from source
  const factoryProxy = await upgrades.deployProxy(new EmptyMockContract__factory(deployer));
  const proxyAdmin = await upgrades.admin.getInstance();
  const registryFactory = new RoyaltyRegistry__factory(deployer);
  let royaltyRegistry = await registryFactory.deploy();
  await proxyAdmin.upgrade(factoryProxy.address, royaltyRegistry.address);
  royaltyRegistry = RoyaltyRegistry__factory.connect(factoryProxy.address, deployer);

  return royaltyRegistry;
}

export async function deployFETH({
  deployer,
  marketAddress,
  dropMarketAddress,
}: {
  deployer: SignerWithAddress;
  marketAddress: string;
  dropMarketAddress: string;
}): Promise<FETH> {
  const FETH = new FETH__factory(deployer);
  return (await upgrades.deployProxy(FETH, [], {
    unsafeAllow: ["state-variable-immutable", "constructor"], // https://docs.openzeppelin.com/upgrades-plugins/1.x/faq#why-cant-i-use-immutable-variables
    constructorArgs: [marketAddress, dropMarketAddress, ONE_DAY],
  })) as FETH;
}

export async function deployMarketAndFETH({
  deployer,
  treasury,
  royaltyRegistry,
}: {
  deployer: SignerWithAddress;
  treasury: FoundationTreasury;
  royaltyRegistry: RoyaltyRegistry;
}): Promise<{ feth: FETH; nftDropMarket: NFTDropMarket }> {
  // Create a proxy to an empty mock in order to determine the proxy address to be used in constructor args
  const mockFactory = new EmptyMockContract__factory(deployer);
  const dropMarketProxy = await upgrades.deployProxy(mockFactory);
  const feth = await deployFETH({
    deployer,
    marketAddress: dropMarketProxy.address,
    dropMarketAddress: dropMarketProxy.address,
  });

  const factory = new NFTDropMarket__factory(deployer);
  await upgrades.upgradeProxy(dropMarketProxy, factory, {
    unsafeAllow: ["state-variable-immutable", "constructor"], // https://docs.openzeppelin.com/upgrades-plugins/1.x/faq#why-cant-i-use-immutable-variables
    constructorArgs: [treasury.address, feth.address, royaltyRegistry.address],
  });
  const nftDropMarket = NFTDropMarket__factory.connect(dropMarketProxy.address, deployer);
  await nftDropMarket.connect(deployer).initialize();

  return { feth, nftDropMarket };
}

export async function deployCollectionFactory(
  admin: SignerWithAddress,
  treasury: FoundationTreasury,
): Promise<NFTCollectionFactory> {
  const nftCollectionFactoryV2Proxy = await upgrades.deployProxy(new EmptyMockContract__factory(admin));

  const dropCollectionImplementationFactory = new NFTDropCollection__factory(admin);
  const nftDropCollectionImplementation = await dropCollectionImplementationFactory.deploy(
    nftCollectionFactoryV2Proxy.address,
  );

  const nftCollectionFactoryV2Factory = new NFTCollectionFactory__factory(admin);
  await upgrades.upgradeProxy(nftCollectionFactoryV2Proxy, nftCollectionFactoryV2Factory, {
    call: { fn: "initialize", args: [0] },
    unsafeAllow: ["state-variable-immutable", "constructor"], // https://docs.openzeppelin.com/upgrades-plugins/1.x/faq#why-cant-i-use-immutable-variables
    constructorArgs: [treasury.address],
  });

  const nftCollectionFactoryV2 = NFTCollectionFactory__factory.connect(nftCollectionFactoryV2Proxy.address, admin);
  await nftCollectionFactoryV2
    .connect(admin)
    .adminUpdateNFTDropCollectionImplementation(nftDropCollectionImplementation.address);

  const collectionImplementationFactory = new NFTCollection__factory(admin);
  const collectionImplementation = await collectionImplementationFactory.deploy(nftCollectionFactoryV2.address);
  await nftCollectionFactoryV2.connect(admin).adminUpdateNFTCollectionImplementation(collectionImplementation.address);

  return nftCollectionFactoryV2;
}

export async function deployPercentSplit(
  admin: SignerWithAddress,
  treasury: FoundationTreasury,
): Promise<PercentSplitETH> {
  const splitFactory = new PercentSplitETH__factory(admin);
  const split = await splitFactory.deploy();
  await split.initialize([
    {
      recipient: treasury.address,
      percentInBasisPoints: 3334,
    },
    {
      recipient: treasury.address,
      percentInBasisPoints: 3333,
    },
    {
      recipient: treasury.address,
      percentInBasisPoints: 3333,
    },
  ]);
  return split;
}

export async function deployNFTDropCollectionImplementation(
  admin: SignerWithAddress,
  factoryProxyAddress: string,
): Promise<NFTDropCollection> {
  const implementationFactory = new NFTDropCollection__factory(admin);
  return await implementationFactory.deploy(factoryProxyAddress);
}

export async function deployCollectionDropFactory(
  admin: SignerWithAddress,
  treasury: FoundationTreasury,
  nftDropCollectionAddress?: string,
): Promise<NFTCollectionFactory> {
  const nftCollectionFactoryV2Factory = new NFTCollectionFactory__factory(admin);
  const factory = await nftCollectionFactoryV2Factory.deploy(treasury.address);
  await factory.initialize(0);
  if (nftDropCollectionAddress) await factory.adminUpdateNFTDropCollectionImplementation(nftDropCollectionAddress);
  return factory;
}

export async function deployCollectionImplementation(
  admin: SignerWithAddress,
  factory: NFTCollectionFactory,
): Promise<NFTCollection> {
  const implementationFactory = new NFTCollection__factory(admin);
  return await implementationFactory.deploy(factory.address);
}

export async function deployCollectionImplementationsAndFactory(
  admin: SignerWithAddress,
  treasury: FoundationTreasury,
): Promise<{
  nftCollectionFactoryV2: NFTCollectionFactory;
  NFTDropCollectionImplementation: NFTDropCollection;
  collectionImplementation: NFTCollection;
}> {
  const nftCollectionFactoryV2Proxy = await upgrades.deployProxy(new EmptyMockContract__factory(admin));
  const NFTDropCollectionImplementation = await deployNFTDropCollectionImplementation(
    admin,
    nftCollectionFactoryV2Proxy.address,
  );

  const nftCollectionFactoryV2Factory = new NFTCollectionFactory__factory(admin);
  await upgrades.upgradeProxy(nftCollectionFactoryV2Proxy, nftCollectionFactoryV2Factory, {
    call: { fn: "initialize", args: [0] },
    unsafeAllow: ["state-variable-immutable", "constructor"], // https://docs.openzeppelin.com/upgrades-plugins/1.x/faq#why-cant-i-use-immutable-variables
    constructorArgs: [treasury.address],
  });

  const nftCollectionFactoryV2 = NFTCollectionFactory__factory.connect(nftCollectionFactoryV2Proxy.address, admin);
  await nftCollectionFactoryV2
    .connect(admin)
    .adminUpdateNFTDropCollectionImplementation(NFTDropCollectionImplementation.address);

  const collectionImplementationFactory = new NFTCollection__factory(admin);
  const collectionImplementation = await collectionImplementationFactory.deploy(nftCollectionFactoryV2.address);
  await nftCollectionFactoryV2.adminUpdateNFTCollectionImplementation(collectionImplementation.address);

  return { nftCollectionFactoryV2, NFTDropCollectionImplementation, collectionImplementation };
}

export async function deployMockNFT(deployer: SignerWithAddress): Promise<MockNFT> {
  const MockNFT = new MockNFT__factory(deployer);
  return await MockNFT.deploy();
}

export async function deployWETH9(deployer: SignerWithAddress): Promise<WETH9> {
  const wethFactory = new WETH9__factory(deployer);
  return await wethFactory.deploy();
}
