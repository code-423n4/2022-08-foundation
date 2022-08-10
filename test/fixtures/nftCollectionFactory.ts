import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers } from "hardhat";
import { NFTCollectionFactory, NFTDropMarket, PercentSplitETH } from "../../src/typechain";
import { CallWithoutValueStruct } from "../../src/typechain/NFTCollectionFactory";
import { getExpectedPercentSplit, Royalty } from "../helpers/splits";

type CreateNFTDropCollectionOptionalParams = {
  name?: string;
  symbol?: string;
  baseURI?: string;
  postRevealBaseURIHash?: BytesLike;
  maxTokenId?: BigNumberish;
  approvedMinter?: string;
  nonce?: BigNumberish;
};

type CreateNFTDropCollectionRequiredParams = {
  name: string;
  symbol: string;
  baseURI: string;
  postRevealBaseURIHash: BytesLike;
  maxTokenId: BigNumberish;
  approvedMinter: string;
  nonce: BigNumberish;
};

type CreateNFTDropCollectionArgs = [string, string, string, BytesLike, BigNumberish, string, BigNumberish];
type NFTDropCollectionCreatedEventArgs = [
  string,
  string,
  string,
  string,
  string,
  string,
  BytesLike,
  BigNumberish,
  string,
  BigNumberish,
  BigNumberish,
];

function getDefaultParamsCreateNFTDropCollection(contracts: {
  nftDropMarket: NFTDropMarket;
}): CreateNFTDropCollectionRequiredParams {
  return {
    name: "NAME",
    symbol: "SYMBOL",
    baseURI: "ipfs://exampleHashOfPreRevealContentDir/",
    postRevealBaseURIHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ipfs://exampleHashOfFinalContentDir/")),
    maxTokenId: 100,
    approvedMinter: contracts.nftDropMarket.address,
    nonce: BigNumber.from(ethers.utils.randomBytes(32)),
  };
}

function getArgsFromParamsCreateNFTDropCollection(
  paramValues: CreateNFTDropCollectionRequiredParams,
): CreateNFTDropCollectionArgs {
  return [
    paramValues.name,
    paramValues.symbol,
    paramValues.baseURI,
    paramValues.postRevealBaseURIHash,
    paramValues.maxTokenId,
    paramValues.approvedMinter,
    paramValues.nonce,
  ];
}

export function getArgsCreateNFTDropCollection(
  contracts: { nftDropMarket: NFTDropMarket },
  params?: CreateNFTDropCollectionOptionalParams,
): CreateNFTDropCollectionArgs {
  const paramValues = {
    ...getDefaultParamsCreateNFTDropCollection(contracts),
    ...params,
  };
  return getArgsFromParamsCreateNFTDropCollection(paramValues);
}

export function getArgsCreateNFTDropCollectionWithPaymentAddress(
  contracts: { nftDropMarket: NFTDropMarket },
  params: CreateNFTDropCollectionOptionalParams & { paymentAddress: string },
): [...CreateNFTDropCollectionArgs, string] {
  const paramValues = {
    ...getDefaultParamsCreateNFTDropCollection(contracts),
    ...params,
  };
  return [...getArgsFromParamsCreateNFTDropCollection(paramValues), paramValues.paymentAddress];
}

export function getArgsCreateNFTDropCollectionWithPaymentFactory(
  contracts: { nftDropMarket: NFTDropMarket; percentSplitFactory: PercentSplitETH },
  params: CreateNFTDropCollectionOptionalParams & { shares: Royalty[] },
): [...CreateNFTDropCollectionArgs, CallWithoutValueStruct] {
  const callData = contracts.percentSplitFactory.interface.encodeFunctionData("createSplit", [params.shares]);
  const paramValues = {
    ...getDefaultParamsCreateNFTDropCollection(contracts),
    ...params,
  };
  return [
    ...getArgsFromParamsCreateNFTDropCollection(paramValues),
    { target: contracts.percentSplitFactory.address, callData },
  ];
}

export async function getEventArgsNFTDropCollectionCreated(
  contracts: {
    nftDropMarket: NFTDropMarket;
    percentSplitFactory: PercentSplitETH;
    nftCollectionFactoryV2: NFTCollectionFactory;
  },
  creator: { address: string },
  params: CreateNFTDropCollectionOptionalParams & { nonce: BigNumberish; paymentAddress?: string; shares?: Royalty[] },
): Promise<NFTDropCollectionCreatedEventArgs> {
  const paramValues = { ...getDefaultParamsCreateNFTDropCollection(contracts), ...params };
  if (params.shares) {
    if (params.paymentAddress) {
      throw new Error("Cannot have both paymentAddress and shares");
    }
    const split = await getExpectedPercentSplit(contracts, params.shares);
    paramValues.paymentAddress = split.address;
  } else if (!paramValues.paymentAddress) {
    paramValues.paymentAddress = ethers.constants.AddressZero;
  }
  const predictedCollection = await contracts.nftCollectionFactoryV2.predictNFTDropCollectionAddress(
    creator.address,
    paramValues.nonce,
  );
  const version = await contracts.nftCollectionFactoryV2.versionNFTDropCollection();
  return [
    predictedCollection,
    creator.address,
    paramValues.approvedMinter,
    paramValues.name,
    paramValues.symbol,
    paramValues.baseURI,
    paramValues.postRevealBaseURIHash,
    paramValues.maxTokenId,
    paramValues.paymentAddress,
    version,
    paramValues.nonce,
  ];
}
