import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { snapshotEach } from "../../helpers/snapshot";

describe("NFTDropMarket / FixedPrice / getSellerOf", () => {
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let collector: SignerWithAddress;
  let contracts: TestContracts;
  const tokenId = 1;
  const price = ethers.utils.parseEther("1");

  snapshotEach(async () => {
    [admin, creator, collector] = await ethers.getSigners();
    contracts = await deployAll(admin, creator);
  });

  it("Returns address(0) before listing", async () => {
    const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(contracts.nftDropCollection.address, tokenId);
    expect(sellerOrOwner).to.eq(ethers.constants.AddressZero);
  });

  describe("After listing", () => {
    beforeEach(async () => {
      await contracts.nftDropMarket
        .connect(creator)
        .createFixedPriceSale(contracts.nftDropCollection.address, price, 1);
    });

    it("Returns creator when listed but not yet sold", async () => {
      const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(contracts.nftDropCollection.address, tokenId);
      expect(sellerOrOwner).to.eq(creator.address);
    });

    describe("After sale", () => {
      beforeEach(async () => {
        await contracts.nftDropMarket
          .connect(collector)
          .mintFromFixedPriceSale(contracts.nftDropCollection.address, 1, ethers.constants.AddressZero, {
            value: price,
          });
      });

      it("Returns 0 when sold", async () => {
        const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(contracts.nftDropCollection.address, tokenId);
        expect(sellerOrOwner).to.eq(ethers.constants.AddressZero);
      });

      it("Unsold NFTs still returns creator", async () => {
        const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(
          contracts.nftDropCollection.address,
          tokenId + 1,
        );
        expect(sellerOrOwner).to.eq(creator.address);
      });

      describe("Once sold out", () => {
        beforeEach(async () => {
          await contracts.nftDropCollection.connect(creator).updateMaxTokenId(1);
        });

        it("Returns 0 when sold", async () => {
          const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(contracts.nftDropCollection.address, tokenId);
          expect(sellerOrOwner).to.eq(ethers.constants.AddressZero);
        });

        it("Returns address(0) if not minted after sold out", async () => {
          const sellerOrOwner = await contracts.nftDropMarket.getSellerOf(
            contracts.nftDropCollection.address,
            tokenId + 1,
          );
          expect(sellerOrOwner).to.eq(ethers.constants.AddressZero);
        });
      });
    });
  });
});
