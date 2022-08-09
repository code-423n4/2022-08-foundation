const shell = require("shelljs");

module.exports = {
  istanbulReporter: ["html"],
  onCompileComplete: async function (_config) {
    await run("typechain");
  },
  onIstanbulComplete: async function (_config) {
    // We need to do this because solcover generates bespoke artifacts.
    shell.rm("-rf", "./artifacts");
    shell.rm("-rf", "./src/typechain");
  },
  skipFiles: [
    "mocks",
    "test",
    "FNDMiddleware",
    "archive",
    "FETH",
    "PercentSplitETH",
    "FoundationTreasury",
    "libraries/BytesLibrary",
    "libraries/LockedBalance",
    "mixins/treasury",
  ],
  istanbulReporter: ["lcov", "html", "text-summary"],
  mocha: {
    fgrep: "[skip-on-coverage]",
    invert: true,
  },
};
