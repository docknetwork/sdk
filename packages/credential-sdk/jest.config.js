export default {
  bail: true,
  moduleNameMapper: {},
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
