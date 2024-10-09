export default {
  bail: true,
  moduleNameMapper: {
    "^@docknetwork/credential-sdk/(.*)$":
      "<rootDir>/../credential-sdk/dist/esm/$1",
    "^@docknetwork/dock-blockchain-api/(.*)$":
      "<rootDir>/../dock-blockchain-api/dist/esm/$1",
    "^@docknetwork/cheqd-blockchain-api/(.*)$":
      "<rootDir>/../cheqd-blockchain-api/dist/esm/$1",
    "^@docknetwork/dock-blockchain-modules/(.*)$":
      "<rootDir>/../dock-blockchain-modules/dist/esm/$1",
    "^@docknetwork/dock-blockchain-api$":
      "<rootDir>/../dock-blockchain-api/dist/esm/index.js",
    "^@docknetwork/cheqd-blockchain-api$":
      "<rootDir>/../cheqd-blockchain-api/dist/esm/index.js",
    "^@docknetwork/dock-blockchain-modules$":
      "<rootDir>/../dock-blockchain-modules/dist/esm/index.js",
    "^@cheqd/sdk(.*)$": "<rootDir>/../../node_modules/@cheqd/sdk/build/esm/$1",
    "^uint8arrays$": "<rootDir>/../../node_modules/uint8arrays/dist/src",
    "^file-type$": "<rootDir>/../../node_modules/file-type/index.js",
    "^multiformats/(.*)$":
      "<rootDir>/../../node_modules/multiformats/dist/src/$1",
  },
  clearMocks: true,
  testTimeout: 30000,
  testEnvironment: "./tests/test-environment",
  transform: {
    "^.+\\.(ts|js)$": ["babel-jest", { rootMode: "upward" }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@babel|multiformats|@docknetwork|@stablelib|@cheqd|file-type|uint8arrays|multiformats|strtok3|peek-readable|token-types|uint8array-extra)",
  ],
  workerIdleMemoryLimit: "1G",
  verbose: true,
  globals: {
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Buffer,
  },
};
