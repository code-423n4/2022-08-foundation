Summary

- [unprotected-upgrade](#unprotected-upgrade) (1 results) (High)
- [shadowing-local](#shadowing-local) (1 results) (Low)
- [dead-code](#dead-code) (3 results) (Informational)
- [solc-version](#solc-version) (26 results) (Informational)
- [naming-convention](#naming-convention) (6 results) (Informational)
- [unused-state](#unused-state) (1 results) (Informational)

## unprotected-upgrade

Impact: High
Confidence: High

- [ ] [NFTCollection](contracts/NFTCollection.sol#L28-L334) is an upgradeable contract that does not protect its initiliaze functions: [INFTCollectionInitializer.initialize(address,string,string)](contracts/interfaces/INFTCollectionInitializer.sol#L6-L10)[NFTCollection.initialize(address,string,string)](contracts/NFTCollection.sol#L105-L112). Anyone can delete the contract with: [NFTCollection.selfDestruct()](contracts/NFTCollection.sol#L224-L226)
      contracts/NFTCollection.sol#L28-L334

> The template is initialized by the factory when `adminUpdateNFTCollectionImplementation` is called and instances are initialized by the factory when `createNFTCollection` is used to create them. So we are not vulnerable here.

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.

## unused-state

Impact: Informational
Confidence: High

- [AdminRole.\_\_gap](contracts/mixins/roles/AdminRole.sol#L56) is never used in [MinterRole](contracts/mixins/roles/MinterRole.sol#L14-L53)

> Although this contract is not upgradeable and therefore a storage gap is not required, many of our contracts are upgradeable. Some mixins will use a `__gap` that appears unnecessary in order to ease reuse elsewhere in our repo (now or in the future).
