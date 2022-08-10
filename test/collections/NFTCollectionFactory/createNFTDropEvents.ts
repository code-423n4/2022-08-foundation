import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { NFTDropCollection } from "../../../src/typechain";
import {
  getArgsCreateNFTDropCollection,
  getArgsCreateNFTDropCollectionWithPaymentAddress,
  getArgsCreateNFTDropCollectionWithPaymentFactory,
  getEventArgsNFTDropCollectionCreated,
} from "../../fixtures/nftCollectionFactory";
import { getNFTDropCollection } from "../../helpers/collectionContract";
import { BASIS_POINTS } from "../../helpers/constants";
import { deployAll, TestContracts } from "../../helpers/deploy";
import { assertAllLogs, EventLog } from "../../helpers/logs";
import { snapshotEach } from "../../helpers/snapshot";
import { getExpectedPercentSplit, Royalty } from "../../helpers/splits";

describe("NFTDropCollection / createNFTDropEvents", () => {
  const nonce = 42;

  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;
  let paymentAddress: SignerWithAddress;
  let splitRecipient1: SignerWithAddress;
  let splitRecipient2: SignerWithAddress;
  let splitRecipient3: SignerWithAddress;
  let splitRecipient4: SignerWithAddress;
  let splitRecipient5: SignerWithAddress;
  let contracts: TestContracts;
  let tx: ContractTransaction;
  let drop: NFTDropCollection;

  snapshotEach(async () => {
    [
      deployer,
      creator,
      paymentAddress,
      splitRecipient1,
      splitRecipient2,
      splitRecipient3,
      splitRecipient4,
      splitRecipient5,
    ] = await ethers.getSigners();
    contracts = await deployAll(deployer, creator);
  });

  describe("createNFTDropCollection", () => {
    describe("With minter", () => {
      beforeEach(async () => {
        tx = await contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { nonce }));
        drop = await getNFTDropCollection(tx);
      });

      it("Assert logs", async () => {
        await assertExpectedLogs();
      });
    });

    describe("Without minter", () => {
      const approvedMinter = ethers.constants.AddressZero;

      beforeEach(async () => {
        tx = await contracts.nftCollectionFactoryV2
          .connect(creator)
          .createNFTDropCollection(...getArgsCreateNFTDropCollection(contracts, { nonce, approvedMinter }));
        drop = await getNFTDropCollection(tx);
      });

      it("Assert logs", async () => {
        await assertExpectedLogs({ approvedMinter });
      });
    });
  });

  describe("createNFTDropCollectionWithPaymentAddress", () => {
    describe("With minter", () => {
      beforeEach(async () => {
        tx = await contracts.nftCollectionFactoryV2.connect(creator).createNFTDropCollectionWithPaymentAddress(
          ...getArgsCreateNFTDropCollectionWithPaymentAddress(contracts, {
            paymentAddress: paymentAddress.address,
            nonce,
          }),
        );
        drop = await getNFTDropCollection(tx);
      });

      it("Assert logs", async () => {
        await assertExpectedLogs({ paymentAddress: paymentAddress.address });
      });
    });

    describe("Without minter", () => {
      const approvedMinter = ethers.constants.AddressZero;

      beforeEach(async () => {
        tx = await contracts.nftCollectionFactoryV2.connect(creator).createNFTDropCollectionWithPaymentAddress(
          ...getArgsCreateNFTDropCollectionWithPaymentAddress(contracts, {
            paymentAddress: paymentAddress.address,
            nonce,
            approvedMinter,
          }),
        );
        drop = await getNFTDropCollection(tx);
      });

      it("Assert logs", async () => {
        await assertExpectedLogs({ paymentAddress: paymentAddress.address, approvedMinter });
      });
    });
  });

  describe("createNFTDropCollectionWithPaymentFactory", () => {
    let shares: Royalty[];

    beforeEach(async () => {
      shares = [
        {
          recipient: splitRecipient1.address,
          percentInBasisPoints: 1,
        },
        {
          recipient: splitRecipient2.address,
          percentInBasisPoints: 2,
        },
        {
          recipient: splitRecipient3.address,
          percentInBasisPoints: 3,
        },
        {
          recipient: splitRecipient4.address,
          percentInBasisPoints: 4,
        },
        {
          recipient: splitRecipient5.address,
          percentInBasisPoints: BASIS_POINTS.sub(1 + 2 + 3 + 4),
        },
      ];
    });

    describe("New split contract", () => {
      describe("With minter", () => {
        beforeEach(async () => {
          tx = await contracts.nftCollectionFactoryV2
            .connect(creator)
            .createNFTDropCollectionWithPaymentFactory(
              ...getArgsCreateNFTDropCollectionWithPaymentFactory(contracts, { shares, nonce }),
            );
          drop = await getNFTDropCollection(tx);
        });

        it("Assert logs", async () => {
          await assertExpectedLogs({ shares });
        });
      });

      describe("Without minter", () => {
        const approvedMinter = ethers.constants.AddressZero;

        beforeEach(async () => {
          tx = await contracts.nftCollectionFactoryV2
            .connect(creator)
            .createNFTDropCollectionWithPaymentFactory(
              ...getArgsCreateNFTDropCollectionWithPaymentFactory(contracts, { shares, nonce, approvedMinter }),
            );
          drop = await getNFTDropCollection(tx);
        });

        it("Assert logs", async () => {
          await assertExpectedLogs({ shares, approvedMinter });
        });
      });
    });

    describe("Existing split contract", () => {
      const splitAlreadyCreated = true;

      beforeEach(async () => {
        await contracts.percentSplitFactory.createSplit(shares);
      });

      describe("With minter", () => {
        beforeEach(async () => {
          tx = await contracts.nftCollectionFactoryV2
            .connect(creator)
            .createNFTDropCollectionWithPaymentFactory(
              ...getArgsCreateNFTDropCollectionWithPaymentFactory(contracts, { shares, nonce }),
            );
          drop = await getNFTDropCollection(tx);
        });

        it("Assert logs", async () => {
          await assertExpectedLogs({ shares, splitAlreadyCreated });
        });
      });

      describe("Without minter", () => {
        const approvedMinter = ethers.constants.AddressZero;

        beforeEach(async () => {
          tx = await contracts.nftCollectionFactoryV2
            .connect(creator)
            .createNFTDropCollectionWithPaymentFactory(
              ...getArgsCreateNFTDropCollectionWithPaymentFactory(contracts, { shares, nonce, approvedMinter }),
            );
          drop = await getNFTDropCollection(tx);
        });

        it("Assert logs", async () => {
          await assertExpectedLogs({ shares, approvedMinter, splitAlreadyCreated });
        });
      });
    });
  });

  async function assertExpectedLogs(options?: {
    paymentAddress?: string;
    splitAlreadyCreated?: boolean;
    shares?: Royalty[];
    approvedMinter?: string;
  }): Promise<void> {
    const results: EventLog[] = [];

    if (options?.shares) {
      if (options.paymentAddress) {
        throw new Error("Cannot specify both paymentAddress and shares");
      }
      // Predict split address
      const split = await getExpectedPercentSplit(contracts, options.shares);

      if (!options.splitAlreadyCreated) {
        // If creating a new split, those events are emitted first
        results.push({
          // Factory emits creation
          contract: contracts.percentSplitFactory,
          eventName: "PercentSplitCreated",
          args: [split.address],
        });
        for (const share of options.shares) {
          results.push({
            // New contract emits shares
            contract: split,
            eventName: "PercentSplitShare",
            args: [share.recipient, share.percentInBasisPoints],
          });
        }
        results.push({
          contract: split,
          // The split contract completed initialization
          eventName: "Initialized",
          args: [
            // version
            1,
          ],
        });
      }
    }

    results.push(
      // Grant admin role
      {
        contract: drop,
        eventName: "RoleGranted",
        args: [await drop.DEFAULT_ADMIN_ROLE(), creator.address, contracts.nftCollectionFactoryV2.address],
      },
    );

    if (options?.approvedMinter !== ethers.constants.AddressZero) {
      results.push(
        // Grant minter role
        {
          contract: drop,
          eventName: "RoleGranted",
          args: [
            await drop.MINTER_ROLE(),
            // Allowing the drop market to mint
            contracts.nftDropMarket.address,
            contracts.nftCollectionFactoryV2.address,
          ],
        },
      );
    }

    results.push(
      ...[
        // Initialized
        {
          contract: drop,
          eventName: "Initialized",
          args: [
            // version
            1,
          ],
        },
        // Factory creation event
        {
          contract: contracts.nftCollectionFactoryV2,
          eventName: "NFTDropCollectionCreated",
          args: [...(await getEventArgsNFTDropCollectionCreated(contracts, creator, { nonce, ...options }))],
        },
      ],
    );

    // Confirm all expected events
    await assertAllLogs(tx, results);
  }
});
