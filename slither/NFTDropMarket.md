> Note: Slither is crashing on the try/catch blocks in this contract. We have run the report with those removed, but because of those changes the line numbers may not align and some of the findings may not be complete.

Summary

- [uninitialized-storage](#uninitialized-storage) (2 results) (High)
- [divide-before-multiply](#divide-before-multiply) (1 results) (Medium)
- [uninitialized-local](#uninitialized-local) (1 results) (Medium)
- [reentrancy-events](#reentrancy-events) (3 results) (Low)
- [assembly](#assembly) (2 results) (Informational)
- [solc-version](#solc-version) (22 results) (Informational)
- [low-level-calls](#low-level-calls) (2 results) (Informational)
- [naming-convention](#naming-convention) (10 results) (Informational)
- [unused-state](#unused-state) (4 results) (Informational)
- [constable-states](#constable-states) (2 results) (Optimization)

## uninitialized-storage

Impact: High
Confidence: High

- [ ] ID-0
      [MarketFees.\_getFees(address,uint256,address,uint256,address).\_recipients_scope_0](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L435) is a storage variable never initialized

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L435

- [ ] ID-1
      [MarketFees.\_getFees(address,uint256,address,uint256,address).\_splitPerRecipientInBasisPoints_scope_1](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L436) is a storage variable never initialized

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L436

> Invalid. These are not storage variables, they are `memory` variables initialized and only used inline.

## divide-before-multiply

Impact: Medium
Confidence: Medium

- [ ] ID-2
      [MarketFees.\_getFees(address,uint256,address,uint256,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L391-L530) performs a multiplication on the result of a division: -[creatorRev = price / CREATOR_ROYALTY_DENOMINATOR](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L471) -[royalty = (creatorRev \* creatorShares[i_scope_2]) / totalShares](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L504)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L391-L530

> Valid -- however the value here is in ETH so rounding errors should be minimal. We intentionally favor the first creator listed if a rounding error does occur. Due to the complexity of the code here, we will not be making further adjustments to the logic here to minimize rounding at this time.

## uninitialized-local

Impact: Medium
Confidence: Medium

- [ ] ID-3
      [MarketFees.\_getFees(address,uint256,address,uint256,address).totalShares](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L481) is a local variable never initialized

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L481

> The default state of `0` is valid when logic does not flow into the `if` block which may assign a different value.

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-4
      Reentrancy in [MarketFees.\_distributeFunds(address,uint256,address,uint256,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L98-L153):
      External calls: - [\_sendValueWithFallbackWithdraw(seller,sellerRev,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L139) - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47) - [\_sendValueWithFallbackWithdraw(getFoundationTreasury(),totalFees,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L142) - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47) - [\_sendValueWithFallbackWithdraw(buyReferrer,buyReferrerFee,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L146) - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47)
      Event emitted after the call(s): - [BuyReferralPaid(nftContract,tokenId,buyReferrer,buyReferrerFee,0)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L147) - [WithdrawalToFETH(user,amount)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L48) - [\_sendValueWithFallbackWithdraw(buyReferrer,buyReferrerFee,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L146)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L98-L153

- [ ] ID-5
      Reentrancy in [SendValueWithFallbackWithdraw.\_sendValueWithFallbackWithdraw(address,uint256,uint256)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L34-L50):
      External calls: - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47)
      Event emitted after the call(s): - [WithdrawalToFETH(user,amount)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L48)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L34-L50

- [ ] ID-6
      Reentrancy in [MarketFees.\_distributeFunds(address,uint256,address,uint256,address)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L98-L153):
      External calls: - [\_sendValueWithFallbackWithdraw(seller,sellerRev,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L139) - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47) - [\_sendValueWithFallbackWithdraw(getFoundationTreasury(),totalFees,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L142) - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44) - [feth.depositFor{value: amount}(user)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L47)
      Event emitted after the call(s): - [WithdrawalToFETH(user,amount)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L48) - [\_sendValueWithFallbackWithdraw(getFoundationTreasury(),totalFees,SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L142)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L98-L153

> Most of the instances here are events that are based on the results of an external call. In those scenarios, we cannot fix the reported issue here. For the `BuyReferralPaid` event we are opted not to fix in order to keep the code simple and easy to follow -- we do not believe the values emitted are at risk due to reentrancy.

## assembly

Impact: Informational
Confidence: High

- [ ] ID-7
      [ArrayLibrary.capLength(address[],uint256)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L13-L19) uses assembly - [INLINE ASM](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L15-L17)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L13-L19

- [ ] ID-8
      [ArrayLibrary.capLength(uint256[],uint256)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L25-L31) uses assembly - [INLINE ASM](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L27-L29)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/libraries/ArrayLibrary.sol#L25-L31

> We have a very limited amount of assembly included. These are working around a limitation in Solidity. Any issues with this code would be in scope.

## solc-version

Impact: Informational
Confidence: High

> We have opted into using the most recent version of Solidity.

## low-level-calls

Impact: Informational
Confidence: High

- [ ] ID-31
      Low level call in [OZERC165Checker.supportsERC165InterfaceUnchecked(address,bytes4)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/OZERC165Checker.sol#L32-L37): - [(success,result) = account.staticcall{gas: 30000}(encodedParams)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/OZERC165Checker.sol#L34)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/OZERC165Checker.sol#L32-L37

- [ ] ID-32
      Low level call in [SendValueWithFallbackWithdraw.\_sendValueWithFallbackWithdraw(address,uint256,uint256)](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L34-L50): - [(success) = user.call{gas: gasLimit,value: amount}()](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L44)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L34-L50

> We intentionally use a low level call here, in order to use more than the default amount of gas for sending value. We are not using the OpenZeppelin `sendValue` helper here in order to put a cap on the max amount of gas the call may consume.

## naming-convention

Impact: Informational
Confidence: High

> With the exception of leading underscores used on some param names, our variables should consistently be using camel case format.

## unused-state

Impact: Informational
Confidence: High

- [ ] ID-43
      [FoundationTreasuryNode.\_\_gap_was_treasury](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FoundationTreasuryNode.sol#L22) is never used in [NFTDropMarket](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol#L63-L151)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FoundationTreasuryNode.sol#L22

- [ ] ID-44
      [SendValueWithFallbackWithdraw.\_\_gap_was_pendingWithdrawals](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L20) is never used in [NFTDropMarket](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol#L63-L151)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L20

- [ ] ID-45
      [NFTDropMarketFixedPriceSale.\_\_gap](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/nftDropMarket/NFTDropMarketFixedPriceSale.sol#L313) is never used in [NFTDropMarket](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol#L63-L151)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/nftDropMarket/NFTDropMarketFixedPriceSale.sol#L313

- [ ] ID-46
      [MarketFees.\_\_gap_was_fees](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L42) is never used in [NFTDropMarket](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/NFTDropMarket.sol#L63-L151)

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/MarketFees.sol#L42

> These `__gap*` variables are reserving space which was used in an older version of one of our contracts. This pattern helps to ensure that we do not read from these slots in the future, getting previously populated data which could distort expected results.

> The entries simply called `__gap` are reserving free space for new data to be added to certain mixins in the future, in a location that's available without shifting storage for other inherited contracts.

## constable-states

Impact: Optimization
Confidence: High

- [ ] ID-47
      [FoundationTreasuryNode.\_\_gap_was_treasury](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FoundationTreasuryNode.sol#L22) should be constant

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/FoundationTreasuryNode.sol#L22

- [ ] ID-48
      [SendValueWithFallbackWithdraw.\_\_gap_was_pendingWithdrawals](https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L20) should be constant

https://github.com/code-423n4/2022-08-foundation/tree/main/contracts/mixins/shared/SendValueWithFallbackWithdraw.sol#L20

> These `__gap` variables are reserving space which was used in an older version of one of our contracts. This pattern helps to ensure that we do not read from these slots in the future, getting previously populated data which could distort expected results.
