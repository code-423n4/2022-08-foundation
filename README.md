# Foundation Drops contest details

- \$38,000 USDC main award pot
- \$2,000 USDC gas optimization award pot
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2022-08-foundation-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts August 11, 2022 20:00 UTC
- Ends August 15, 2022 20:00 UTC

# Overview

We're releasing four new contracts that are in scope for the audit:

- [NFT Collection Factory](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollectionFactory.sol): An upgradable factory that creates NFT collections. Supports creating and initializing ERC-1165 minimal proxies pointing to NFT collection contract templates.
- [NFT Drop Collection](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol): A contract to batch mint and reveal a collection of NFTs. A creator deploys this collection with the intent of creating a mint drop with a reveal step where all NFTs in the collection have the same baseURI and are differentiated through their token id. In addition to the creator, to facilitate sales by marketplace contracts, any address can be granted permissions to mint from this contract.
- [NFT Collection](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol): A collection of NFTs by a single creator. The NFTs produced by this collection are 1-1 with support for unique baseURI. All NFTs from this contract are minted by the same creator. Note that, this contract exists on mainnet and has been in active use for the past year; however, we've refactored/cleaned it up to be more maintainable, extensible and gas efficient and will be deploying the new version in our upcoming release.
- [NFT Drop Market](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol): A Foundation market contract which enables creators to drop NFT collections. Creators can set sale terms on their deployed NFT collections and collectors can mint from them using the NFT drop market. Currently only supports fixed price sales of `NFT Drop Collections`, does not support any other mechanic or collection type.

For more detailed docs on drops please navigate to [FoundationOS](https://os.foundation.app/docs/creator-tools/drop).

# Scope

## In scope

| Contract                                                                                                                  | Documentation                                                                               | Goerli Deployment                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [NFTCollectionFactory.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollectionFactory.sol) | [NFTCollectionFactory](https://os.foundation.app/docs/creator-tools/nft-collection-factory) | [0xf06eeD0514346511Ffe61efD6F6F0C66bBa284Db](https://goerli.etherscan.io/address/0xf06eeD0514346511Ffe61efD6F6F0C66bBa284Db#readProxyContract) |
| [NFTDropCollection.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol)       | [NFTDropCollection](https://os.foundation.app/docs/creator-tools/nft-drop-collection)       | [0xce844d8b74ad9969bc6d17261dd52693b51320d5](https://goerli.etherscan.io/address/0xce844d8b74ad9969bc6d17261dd52693b51320d5#code)              |
| [NFTCollection.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol)               | [NFTCollection](https://os.foundation.app/docs/creator-tools/nft-collection)                | [0x0d8f20128f93dde8e367adfbd78b2a7ca84a40cd](https://goerli.etherscan.io/address/0x0d8f20128f93dde8e367adfbd78b2a7ca84a40cd#code)              |
| [NFTDropMarket.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol)               | [NFTDropMarket](https://os.foundation.app/docs/creator-tools/nft-drop-market)               | [0xe43562f11737443F760dBf885fa0D30c45C6927B](https://goerli.etherscan.io/address/0xe43562f11737443F760dBf885fa0D30c45C6927B#readProxyContract) |

& all their inherited / library contracts.

We would like to call out **extra attention** to [`NFTDropMarketFixedPriceSale`](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/nftDropMarket/NFTDropMarketFixedPriceSale.sol) and [`MarketFees`](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol) mixins as both of them are highly critical paths that perform accounting, fund distribution and transfers.

### Sizes

This is the complete list of what's in scope for this contest:

| Contract Name                                                                                                                                            | Source Lines of Code | Purpose                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [**NFTDropMarket**](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol)                                              | 61                   | The main / top-level contract for all drop market tools on Foundation.                                                        |
| [Constants](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/Constants.sol)                                            | 10                   | Shared constant values used by various mixins.                                                                                |
| [FETHNode](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FETHNode.sol)                                              | 36                   | A wrapper for communicating with the FETH contract.                                                                           |
| [FoundationTreasuryNode](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FoundationTreasuryNode.sol)                  | 34                   | A wrapper for communicating with the treasury contract which collects Foundation fees and defines the admin & operator roles. |
| [Gap10000](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/Gap10000.sol)                                              | 4                    | A placeholder contract leaving room for new mixins to be added to the future.                                                 |
| [MarketFees](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol)                                          | 285                  | Distributes revenue from sales.                                                                                               |
| [BytesLibrary](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/BytesLibrary.sol)                                          | 30                   | A library for manipulation of byte arrays.                                                                                    |
| [ArrayLibrary](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol)                                          | 17                   | Helper functions for arrays.                                                                                                  |
| [MarketSharedCore](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketSharedCore.sol)                              | 8                    | A base class for Foundation market contracts to define functions that other market contract may implement or extend.          |
| [NFTDropMarketCore](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/nftDropMarket/NFTDropMarketCore.sol)                     | 5                    | A base class for the drop specific market contract to define functions that other mixins may implement or extend.             |
| [NFTDropMarketFixedPriceSale](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/nftDropMarket/NFTDropMarketFixedPriceSale.sol) | 137                  | Allows creators to list a drop collection for sale at a fixed price point.                                                    |
| [**NFTCollectionFactory** ](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollectionFactory.sol)                               | 169                  | A factory to create NFT collections.                                                                                          |
| [AddressLibrary](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/AddressLibrary.sol)                                      | 12                   | A library for address helpers not already covered by the OZ library library.                                                  |
| [**NFTDropCollection**](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol)                                      | 129                  | A contract to batch mint and reveal a collection of NFTs.                                                                     |
| [ContractFactory](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/ContractFactory.sol)                                | 15                   | Stores a reference to the factory which is used to create contract proxies. (shared across all collection types)              |
| [AdminRole](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/roles/AdminRole.sol)                                             | 22                   | Defines a role for admin accounts.                                                                                            |
| [MinterRole](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/roles/MinterRole.sol)                                           | 23                   | Defines a role for minter accounts.                                                                                           |
| [CollectionRoyalties](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/collections/CollectionRoyalties.sol)                   | 41                   | Defines various royalty APIs for broad marketplace support. (shared across all collection types)                              |
| [SequentialMintCollection](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/collections/SequentialMintCollection.sol)         | 47                   | Extends the OZ ERC721 implementation for collections which mint sequential token IDs. (shared across all collection types)    |
| [**NFTCollection**](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol)                                              | 133                  | A collection of NFTs by a single creator.                                                                                     |
| **Total**                                                                                                                                                | 1228                 |

## Out of scope

- [FoundationTreasury.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/FoundationTreasury.sol) and any of its dependencies
- [FETH.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/FETH.sol) and any of its dependencies.
- [PercentSplitETH.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/PercentSplitETH.sol) and any of its dependencies.
- [mocks/\*](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mocks)
- External libraries:
  - [`@openzeppelin/*`](<(https://openzeppelin.com/contracts/)>)
  - [`@manifoldxyz/*`](https://royaltyregistry.xyz/)

Any issues or improvements on how we integrate with the contracts above is in scope.

## Mixins

In order to maintain readability as our contracts grow in complexity, we separate responsibilities into different abstract contracts which we call 'mixins'. We try not to create too many interdependencies between mixins, shared logic may be defined in `NFTDropMarketCore` so mixins do not need to call each other directly.

## Upgrades

Our new factory and NFT drop market contracts will be upgradeable proxies allowing us to add more features overtime. For an overview of the upgrade pattern, refer to the [OpenZeppelin documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

## FETH ERC-20 token

[FETH](https://etherscan.io/address/0x49128cf8abe9071ee24540a296b5ded3f9d50443#readProxyContract) is an [ERC-20 token](https://eips.ethereum.org/EIPS/eip-20) modeled after [WETH9](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code). It has the ability to lockup tokens for 24-25 hours - during this time they may not be transferred or withdrawn, except by our market contract which requested the lockup in the first place.

Since after lockups expire, FETH is just another wrapped ETH token contract - we allow using your available FETH balance to mint from a NFT drop collection.

Note that both FETH and Offers have been [audited](https://code4rena.com/reports/2022-02-foundation) in a previous C4 contest and have been live on mainnet for ~4 months.

# Tests

## Hardhat tests:

Setup:

```bash
yarn
yarn build
```

Test:

```bash
yarn test
```

(run `yarn build` again if ABIs have changed)

The tests in this repo are not our full test suite. We have simplified what was included here to clearly demonstrate core features and interactions; however, they still do a good job in covering most cases.

Troubleshooting:

- If you get `Error: Lock file is already being held` you can try again, deleting ./cache sometimes helps as well. Finding a fix for this common occurrence would be a high value QA issue :)
- [Hardhat Tracer](https://github.com/zemse/hardhat-tracer) is included to help with debugging, e.g. run `yarn test --logs` (or --trace, --fulltrace).
- The test suite takes awhile to run, when testing for something specific execute just that file with `yarn test path/to/test.ts` e.g. `yarn test test/NFTDropMarket/fixedPrice/drop.ts --logs`. And/or update an `it` test to `it.only(...`.

### Gas Testing

The Hardhat gas reporter will print gas usage when running tests. We also have included a custom report we use to measure gas costs for the core scenarios we are interested in. When submitting optimizations, it would be most helpful to us if you communicate the impact in terms of the diff to the [gas-stories.txt](https://github.com/code-423n4/2022-08-foundation/tree/main/gas-stories.txt) file your recommendation would create.

```bash
yarn test-gas-stories
```

> This writes changes to `./gas-stories.txt` locally.

### Coverage

Most, but not all, of our tests have been added to this repo. If you run the coverage report you'll see pretty good coverage. Note that our private repo has 100% coverage, what's included here has been simplified a bit to remove some out of scope contracts and as a result coverage is not perfect here.

```bash
yarn coverage
```

After running this command, you'll need to re-run `yarn build`.

To view the report, open `coverage/index.html` in your browser.

## Forge tests:

See [test/foundry/FixedPriceDrop.sol](https://github.com/code-423n4/2022-08-foundation/tree/main/test/foundry/FixedPriceDrop.sol) for an example you can build on to probe for issues.

Setup:

```bash
git submodule update --init --recursive --remote
yarn
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Test:

```bash
forge test
```

Note: After running forge you need to run `yarn build` again for the Hardhat tests to work.

# Slither

We have run the default detectors with Slither, posted the output along with our responses to each. Please do not submit these findings unless you have reason to believe our responses here are not valid.

> Responses use quote replies like this.

- [NFTCollectionFactory](https://github.com/code-423n4/2022-08-foundation/tree/main/slither/NFTCollectionFactory.md)
- [NFTDropCollection](https://github.com/code-423n4/2022-08-foundation/tree/main/slither/NFTDropCollection.md)
- [NFTCollection](https://github.com/code-423n4/2022-08-foundation/tree/main/slither/NFTCollection.md)
- [NFTDropMarket](https://github.com/code-423n4/2022-08-foundation/tree/main/slither/NFTDropMarket.md)

Note: Slither currently crashes on the `try/catch` blocks in our code. In order to generate these results, we temporarily removed the `try/catch` blocks.

You can use the [`slither` branch](https://github.com/code-423n4/2022-08-foundation/tree/slither) in this repo to run Slither locally. This code has been modified to allow Slither to run locally [with minimal changes](https://github.com/code-423n4/2022-08-foundation/compare/main..slither), but the changes are not part of this contest -- please validate your findings against the `main` branch before submitting findings!
