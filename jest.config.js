module.exports = {
  clearMocks: true,
  testTimeout: 30000,
  // testEnvironment: './tests/test-environment.js',
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel)',
  ],
  setupFilesAfterEnv: [
    './tests/setup-test-env.js',
  ],
  globals: {
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
  },
};
