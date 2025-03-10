import { resolve } from "node:path";

export default {
  bail: true,
  moduleNameMapper: {
    "^@docknetwork/credential-sdk/(.*)$": resolve(
      "../credential-sdk/dist/esm/$1"
    ),
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
