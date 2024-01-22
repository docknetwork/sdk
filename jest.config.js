module.exports = {
  bail: true,
  clearMocks: true,
  testTimeout: 30000,
  testEnvironment: './tests/test-environment',
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel|@digitalbazaar)',
  ],
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
