module.exports = {
  clearMocks: true,
  testTimeout: 30000,
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel)',
  ],
  globals: {
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
  },
};
