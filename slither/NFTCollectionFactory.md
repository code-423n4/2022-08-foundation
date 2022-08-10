Summary

- [reentrancy-events](#reentrancy-events) (3 results) (Low)
- [solc-version](#solc-version) (8 results) (Informational)
- [naming-convention](#naming-convention) (4 results) (Informational)
- [too-many-digits](#too-many-digits) (1 results) (Informational)
- [unused-state](#unused-state) (1 results) (Informational)n)

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-0
      Reentrancy in [NFTCollectionFactory.adminUpdateNFTCollectionImplementation(address)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L202-L218):
      External calls: - [INFTCollectionInitializer(\_implementation).initialize(address(address(rolesContract)),string.concat(NFT Collection Implementation v,versionNFTCollection.toString()),string.concat(NFTv,versionNFTCollection.toString()))](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L211-L215)
      Event emitted after the call(s): - [ImplementationNFTCollectionUpdated(\_implementation,versionNFTCollection)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L217)

https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L202-L218

> As an admin only call and an external call only to a contract we have written, we are not vulnerable to reentrancy here.

- [ ] ID-1
      Reentrancy in [NFTCollectionFactory.\_createNFTDropCollection(string,string,string,bytes32,uint32,address,address,uint256)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L386-L423):
      External calls: - [INFTDropCollectionInitializer(collection).initialize(address(msg.sender),name,symbol,baseURI,postRevealBaseURIHash,maxTokenId,approvedMinter,paymentAddress)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L399-L408)
      Event emitted after the call(s): - [NFTDropCollectionCreated(collection,msg.sender,approvedMinter,name,symbol,baseURI,postRevealBaseURIHash,maxTokenId,paymentAddress,versionNFTDropCollection,nonce)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L410-L422)

https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L386-L423

> The external call made here is only to a contract we have written which does not allow other reentrant calls to occur. So we are not vulnerable to reentrancy here.

- [ ] ID-2
      Reentrancy in [NFTCollectionFactory.createNFTCollection(string,string,uint256)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L257-L270):
      External calls: - [INFTCollectionInitializer(collection).initialize(address(msg.sender),name,symbol)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L267)
      Event emitted after the call(s): - [NFTCollectionCreated(collection,msg.sender,versionNFTCollection,name,symbol,nonce)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L269)

https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L257-L270

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

- [ ] ID-15
      [NFTCollectionFactory.adminUpdateNFTDropCollectionImplementation(address)](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L226-L247) uses literals with too many digits: - [INFTDropCollectionInitializer(\_implementation).initialize(address(address(this)),string.concat(NFT Drop Collection Implementation v,versionNFTDropCollection.toString()),string.concat(NFTDropV,versionNFTDropCollection.toString()),ipfs://bafybeibvxnuaqtvaxu26gdgly2rm4g2piu7b2tqlx2dsz6wwhqbey2gddy/,0x1337000000000000000000000000000000000000000000000000000000001337,1,address(0),address(0))](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L237-L246)

https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L226-L247

> This value simply populates a variable in our template contract, which should never be used directly. Even if there were a bug in the number used here it would not be harmful.

## unused-state

Impact: Informational
Confidence: High

- [ ] ID-16
      [Gap10000.\_\_gap](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/mixins/shared/Gap10000.sol#L14) is never used in [NFTCollectionFactory](https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/NFTCollectionFactory.sol#L62-L451)

https://github.com/code-423n4/2022-08-foundation/blob/main/contracts/mixins/shared/Gap10000.sol#L1414

> This `__gap` is intentionally added, leaving free space to add new mixins to this upgradeable contract in the future.
