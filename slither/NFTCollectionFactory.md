Summary

- [uninitialized-state](#uninitialized-state) (1 results) (High)
- [shadowing-local](#shadowing-local) (1 results) (Low)
- [reentrancy-events](#reentrancy-events) (3 results) (Low)
- [dead-code](#dead-code) (5 results) (Informational)
- [solc-version](#solc-version) (26 results) (Informational)
- [naming-convention](#naming-convention) (5 results) (Informational)
- [too-many-digits](#too-many-digits) (1 results) (Informational)
- [unimplemented-functions](#unimplemented-functions) (1 results) (Informational)
- [unused-state](#unused-state) (2 results) (Informational)
- [constable-states](#constable-states) (1 results) (Optimization)

## uninitialized-state

Impact: High
Confidence: High

- [ ] [SequentialMintCollection.latestTokenId](contracts/mixins/collections/SequentialMintCollection.sol#L25) is never initialized. It is used in: - [SequentialMintCollection.\_updateMaxTokenId(uint32)](contracts/mixins/collections/SequentialMintCollection.sol#L82-L89) - [SequentialMintCollection.totalSupply()](contracts/mixins/collections/SequentialMintCollection.sol#L115-L120)

contracts/mixins/collections/SequentialMintCollection.sol#L25

> This variable begins with a `0` value by design.

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] Reentrancy in [NFTCollectionFactory.adminUpdateNFTCollectionImplementation(address)](contracts/NFTCollectionFactory.sol#L193-L209):
      External calls: - [INFTCollectionInitializer(\_implementation).initialize(address(address(rolesContract)),string.concat(NFT Collection Implementation v,versionNFTCollection.toString()),string.concat(NFTv,versionNFTCollection.toString()))](contracts/NFTCollectionFactory.sol#L202-L206)
      Event emitted after the call(s): - [ImplementationNFTCollectionUpdated(\_implementation,versionNFTCollection)](contracts/NFTCollectionFactory.sol#L208)

contracts/NFTCollectionFactory.sol#L193-L209

> As an admin only call and an external call only to a contract we have written, we are not vulnerable to reentrancy here.

- [ ] Reentrancy in [NFTCollectionFactory.\_createNFTDropCollection(string,string,string,bytes32,uint32,address,address,uint256)](contracts/NFTCollectionFactory.sol#L358-L395):
      External calls: - [INFTDropCollectionInitializer(collection).initialize(address(msg.sender),name,symbol,baseURI,postRevealBaseURIHash,maxTokenId,approvedMinter,paymentAddress)](contracts/NFTCollectionFactory.sol#L371-L380)
      Event emitted after the call(s): - [NFTDropCollectionCreated(collection,msg.sender,approvedMinter,name,symbol,baseURI,postRevealBaseURIHash,maxTokenId,paymentAddress,versionNFTDropCollection,nonce)](contracts/NFTCollectionFactory.sol#L382-L394)

contracts/NFTCollectionFactory.sol#L358-L395

> The external call made here is only to a contract we have written which does not allow other reentrant calls to occur. So we are not vulnerable to reentrancy here.

- [ ] Reentrancy in [NFTCollectionFactory.createNFTCollection(string,string,uint256)](contracts/NFTCollectionFactory.sol#L249-L262):
      External calls: - [INFTCollectionInitializer(collection).initialize(address(msg.sender),name,symbol)](contracts/NFTCollectionFactory.sol#L259)
      Event emitted after the call(s): - [NFTCollectionCreated(collection,msg.sender,versionNFTCollection,name,symbol,nonce)](contracts/NFTCollectionFactory.sol#L261)

contracts/NFTCollectionFactory.sol#L249-L262

> The external call made here is only to a contract we have written which does not allow other reentrant calls to occur. So we are not vulnerable to reentrancy here.

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.

## too-many-digits

Impact: Informational
Confidence: Medium

- [ ] [NFTCollectionFactory.adminUpdateNFTDropCollectionImplementation(address)](contracts/NFTCollectionFactory.sol#L217-L238) uses literals with too many digits: - [INFTDropCollectionInitializer(\_implementation).initialize(address(address(this)),string.concat(NFT Drop Collection Implementation v,versionNFTDropCollection.toString()),string.concat(NFTDropV,versionNFTDropCollection.toString()),ipfs://QmdB9mCxSsbybucRqtbBGGZf88pSoaJnuQ25FS3GJQvVAx/nft.png,0x1337000000000000000000000000000000000000000000000000000000001337,1,address(0),address(0))](contracts/NFTCollectionFactory.sol#L228-L237)

contracts/NFTCollectionFactory.sol#L217-L238

> This value simply populates a variable in our template contract, which should never be used directly. Even if there were a bug in the number used here it would not be harmful.

## unused-state

Impact: Informational
Confidence: High

- [ ] [AdminRole.\_\_gap](contracts/mixins/roles/AdminRole.sol#L56) is never used in [MinterRole](contracts/mixins/roles/MinterRole.sol#L14-L53)

contracts/mixins/roles/AdminRole.sol#L56

- [ ] [Gap10000.\_\_gap](contracts/mixins/shared/Gap10000.sol#L14) is never used in [NFTCollectionFactory](contracts/NFTCollectionFactory.sol#L62-L424)

contracts/mixins/shared/Gap10000.sol#L14

> Although this contract is not upgradeable and therefore a storage gap is not required, many of our contracts are upgradeable. Some mixins will use a `__gap` that appears unnecessary in order to ease reuse elsewhere in our repo (now or in the future).
