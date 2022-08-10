Summary

- [unprotected-upgrade](#unprotected-upgrade) (1 results) (High)
- [events-maths](#events-maths) (1 results) (Low)
- [solc-version](#solc-version) (16 results) (Informational)
- [naming-convention](#naming-convention) (13 results) (Informational)

## unprotected-upgrade

Impact: High
Confidence: High

- [ ] ID-0
      [NFTDropCollection](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L28-L305) is an upgradeable contract that does not protect its initiliaze functions: [INFTDropCollectionInitializer.initialize(address,string,string,string,bytes32,uint32,address,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/interfaces/INFTDropCollectionInitializer.sol#L6-L15)[NFTDropCollection.initialize(address,string,string,string,bytes32,uint32,address,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L120-L152). Anyone can delete the contract with: [NFTDropCollection.selfDestruct()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L209-L211)
      https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L28-L305

> The template is initialized by the factory when `adminUpdateNFTDropCollectionImplementation` is called and instances are initialized by the factory when `createNFTDropCollection` is used to create them. So we are not vulnerable here.

## events-maths

Impact: Low
Confidence: Medium

- [ ] ID-1
      [NFTDropCollection.mintCountTo(uint16,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L171-L187) should emit an event for: - [latestTokenId = latestTokenId + count](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L178)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropCollection.sol#L171-L187

> This information is implicitly available from the most recent mint event (`Transfer` where from is address(0)).

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.
