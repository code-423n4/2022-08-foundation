import { BigNumber, ethers } from "ethers";

export const BASIS_POINTS = BigNumber.from(10000);
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_ETH = ethers.utils.parseEther("1");
