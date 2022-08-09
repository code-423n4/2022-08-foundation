import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatUserConfig } from "hardhat/types";
import "@typechain/hardhat";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-preprocessor";
import "hardhat-tracer";
import "hardhat-storage-layout";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1337,
      },
    },
  },
  typechain: {
    outDir: "src/typechain",
    target: "ethers-v5",
    externalArtifacts: ["node_modules/@manifoldxyz/royalty-registry-solidity/build/contracts/*.json"],
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    excludeContracts: ["mocks/"],
  },
};

export default config;
