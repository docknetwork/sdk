export default {
  bail: true,
  moduleNameMapper: {
    "^@docknetwork/credential-sdk/(.*)$":
      "<rootDir>/packages/credential-sdk/$1",
    "^@docknetwork/dock-blockchain-api/(.*)$":
      "<rootDir>/packages/dock-blockchain-api/$1/",
    "^@docknetwork/dock-blockchain-modules/(.*)$":
      "<rootDir>/packages/dock-blockchain-modules/$1",
  },
  clearMocks: true,
  testTimeout: 30000,
  testEnvironment: "./tests/test-environment",
  transform: {
    "^.+\\.(ts|js)$": ["babel-jest", { rootMode: "upward" }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@babel|multiformats|@docknetwork|@stablelib)",
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
