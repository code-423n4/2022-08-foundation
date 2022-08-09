// Originally from https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts-upgradeable/master/test/introspection/SupportsInterface.behavior.js
/* eslint-disable */ // To avoid typescript errors and warnings after porting from OZ
import { makeInterfaceId } from "@openzeppelin/test-helpers";
import { expect } from "chai";

const INTERFACES: any = {
  ERC165: ["supportsInterface(bytes4)"],
  ERC721: [
    "balanceOf(address)",
    "ownerOf(uint256)",
    "approve(address,uint256)",
    "getApproved(uint256)",
    "setApprovalForAll(address,bool)",
    "isApprovedForAll(address,address)",
    "transferFrom(address,address,uint256)",
    "safeTransferFrom(address,address,uint256)",
    "safeTransferFrom(address,address,uint256,bytes)",
  ],
  ERC721Enumerable: ["totalSupply()", "tokenOfOwnerByIndex(address,uint256)", "tokenByIndex(uint256)"],
  ERC721Metadata: ["name()", "symbol()", "tokenURI(uint256)"],
  ERC1155: [
    "balanceOf(address,uint256)",
    "balanceOfBatch(address[],uint256[])",
    "setApprovalForAll(address,bool)",
    "isApprovedForAll(address,address)",
    "safeTransferFrom(address,address,uint256,uint256,bytes)",
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
  ],
  ERC1155Receiver: [
    "onERC1155Received(address,address,uint256,uint256,bytes)",
    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)",
  ],
  ERC2981: ["royaltyInfo(uint256,uint256)"],
  Admin: ["isAdmin(address)"],
  WithSecondarySales: ["getFeeBps(uint256)", "getFeeRecipients(uint256)"],
  TokenCreator: ["tokenCreator(uint256)"],
  GetRoyalties: ["getRoyalties(uint256)"],
  NFTDropCollectionMint: ["mintCountTo(uint16,address)", "numberOfTokensAvailableToMint()"],
};

export const INTERFACE_IDS: any = {};
const FN_SIGNATURES: any = {};
for (const k of Object.getOwnPropertyNames(INTERFACES)) {
  INTERFACE_IDS[k] = makeInterfaceId.ERC165(INTERFACES[k]);
  for (const fnName of INTERFACES[k]) {
    // the interface id of a single function is equivalent to its function signature
    FN_SIGNATURES[fnName] = makeInterfaceId.ERC165([fnName]);
  }
}

export function shouldSupportInterfaces(interfaces: string[], supportedButNotRegistered = false): void {
  describe("Contract interface", function () {
    beforeEach(function () {
      this.contractUnderTest = this.mock || this.token || this.holder || this.nft;
    });

    for (const k of interfaces) {
      const interfaceId = INTERFACE_IDS[k];
      describe(k, function () {
        describe("ERC165's supportsInterface(bytes4)", function () {
          it("uses less than 32k gas [skip-on-coverage]", async function () {
            expect(await this.contractUnderTest.estimateGas.supportsInterface(interfaceId)).to.be.lte(32000);
          });

          it(
            (supportedButNotRegistered ? "does not claim support" : "claims support") + ` for ${k} (${interfaceId})`,
            async function () {
              if (supportedButNotRegistered) {
                expect(await this.contractUnderTest.supportsInterface(interfaceId)).to.equal(false);
              } else {
                expect(await this.contractUnderTest.supportsInterface(interfaceId)).to.equal(true);
              }
            },
          );
        });

        for (const fnName of INTERFACES[k]) {
          describe(fnName, function () {
            it("has to be implemented", function () {
              expect(this.contractUnderTest.functions[fnName]).to.be.not.null;
            });
          });
        }
      });
    }
  });
}
