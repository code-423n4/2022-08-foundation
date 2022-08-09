Summary

- [unprotected-upgrade](#unprotected-upgrade) (1 results) (High)
- [shadowing-local](#shadowing-local) (1 results) (Low)
- [events-maths](#events-maths) (1 results) (Low)
- [solc-version](#solc-version) (25 results) (Informational)
- [naming-convention](#naming-convention) (14 results) (Informational)

## unprotected-upgrade

Impact: High
Confidence: High

- [ ] [NFTDropCollection](contracts/NFTDropCollection.sol#L28-L294) is an upgradeable contract that does not protect its initiliaze functions: [INFTDropCollectionInitializer.initialize(address,string,string,string,bytes32,uint32,address,address)](contracts/interfaces/INFTDropCollectionInitializer.sol#L6-L15)[NFTDropCollection.initialize(address,string,string,string,bytes32,uint32,address,address)](contracts/NFTDropCollection.sol#L119-L151). Anyone can delete the contract with: [NFTDropCollection.selfDestruct()](contracts/NFTDropCollection.sol#L204-L206)
      contracts/NFTDropCollection.sol#L28-L294

> The template is initialized by the factory when `adminUpdateNFTDropCollectionImplementation` is called and instances are initialized by the factory when `createNFTDropCollection` is used to create them. So we are not vulnerable here.

## events-maths

Impact: Low
Confidence: Medium

- [ ] [NFTDropCollection.mintCountTo(uint16,address)](contracts/NFTDropCollection.sol#L167-L183) should emit an event for: - [latestTokenId = latestTokenId + count](contracts/NFTDropCollection.sol#L174)

contracts/NFTDropCollection.sol#L167-L183

> This information is implicitly available from the most recent mint event (`Transfer` where from is address(0)).

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.
