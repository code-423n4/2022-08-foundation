import { ethers } from "hardhat";
import { NFTCollectionFactory, NFTCollection, NFTCollection__factory, WETH9 } from "../../../../src/typechain";
import { expect } from "chai";
import { deployAll, deployWETH9 } from "../../../helpers/deploy";
import { testIpfsPath } from "../../../helpers/testData";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { snapshotEach } from "../../../helpers/snapshot";

/**
 * Confirms that a specific attack to drain tokens stored by the NFT contract is not possible.
 */
describe("NFTCollection / paymentFactory / drainTokens", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let rando: SignerWithAddress;
  let nft: NFTCollection;
  let weth9: WETH9;
  let nftCollectionFactoryV2: NFTCollectionFactory;
  const nftWethBalanceBefore = ethers.utils.parseEther("1");

  snapshotEach(async () => {
    [deployer, creator, rando] = await ethers.getSigners();
    ({ nftCollectionFactoryV2 } = await deployAll(deployer, creator));
    weth9 = await deployWETH9(deployer);
    const NAME = "NAME";
    const SYMBOL = "SYM";
    const NONCE = 0;
    await nftCollectionFactoryV2.connect(creator).createNFTCollection(NAME, SYMBOL, NONCE);
    const nftAddress = await nftCollectionFactoryV2.predictNFTCollectionAddress(creator.address, NONCE);
    nft = NFTCollection__factory.connect(nftAddress, creator);
    await weth9.connect(rando).deposit({ value: nftWethBalanceBefore.mul(2) });
    await weth9.connect(rando).transfer(nft.address, nftWethBalanceBefore);
  });

  it("WETH balance before", async () => {
    const balance7 = await weth9.balanceOf(nft.address);
    expect(balance7).to.eq(nftWethBalanceBefore);
  });

  it("Funds cannot be drained with the factory", async () => {
    // Attempt to transfer 1 wei
    const callData = weth9.interface.encodeFunctionData("transfer", [rando.address, 1]);
    await expect(nft.mintWithCreatorPaymentFactory(testIpfsPath[0], weth9.address, callData)).to.be.revertedWith(
      "InternalProxyCall: did not return a contract",
    );
  });
});
