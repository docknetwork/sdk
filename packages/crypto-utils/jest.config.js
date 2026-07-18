export default {
  bail: true,
  clearMocks: true,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['babel-jest', { rootMode: 'upward' }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@stablelib|uuid)',
  ],
  verbose: true,
};
