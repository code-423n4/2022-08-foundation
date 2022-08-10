Summary

- [unprotected-upgrade](#unprotected-upgrade) (1 results) (High)
- [dead-code](#dead-code) (1 results) (Informational)
- [solc-version](#solc-version) (14 results) (Informational)
- [naming-convention](#naming-convention) (4 results) (Informational)

## unprotected-upgrade

Impact: High
Confidence: High

- [ ] ID-0
      [NFTCollection](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol#L28-L338) is an upgradeable contract that does not protect its initiliaze functions: [INFTCollectionInitializer.initialize(address,string,string)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/interfaces/INFTCollectionInitializer.sol#L6-L10)[NFTCollection.initialize(address,string,string)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol#L105-L112). Anyone can delete the contract with: [NFTCollection.selfDestruct()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol#L230-L232)
      https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTCollection.sol#L28-L338

> The template is initialized by the factory when `adminUpdateNFTCollectionImplementation` is called and instances are initialized by the factory when `createNFTCollection` is used to create them. So we are not vulnerable here.

## dead-code

Impact: Informational
Confidence: Medium

- [ ] ID-1
      [AddressLibrary.callAndReturnContractAddress(CallWithoutValue)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/AddressLibrary.sol#L34-L39) is never used and should be removed

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/AddressLibrary.sol#L34-L39

> Invalid. This is just a result of how I updated the repo in order to generate these results.

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.
