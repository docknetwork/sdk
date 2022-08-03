module.exports = {
  bail: true,
  clearMocks: true,
  testTimeout: 30000,
  testEnvironment: './tests/test-environment.js',
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel)',
  ],
  globals: {
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
  },
};
