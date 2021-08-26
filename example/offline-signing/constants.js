/**
 * @file Keeps the information for each chain. Some of this information like `genesis` or `specName` is immutable but
 * some like `specVersion` and `transactionVersion` can change and they should be updated to match the chain.
 */

export const MAINNET_INFO = {
  ss58Format: 22,
  properties: {
    ss58Format: 22,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0x6bfe24dca2a3be10f22212678ac13a6446ec764103c0f3471c71609eac384aae',
  name: 'Dock PoS Mainnet',
  specName: 'dock-pos-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 31,
  transactionVersion: 1,
};

export const TESTNET_INFO = {
  ss58Format: 21,
  properties: {
    ss58Format: 21,
    tokenDecimals: 6,
    tokenSymbol: 'DOCK',
  },
  genesis: '0x59d93e2ce42abb8aa52ca9a9e820233667104751f8f2980578a47a26a7235027',
  name: 'Dock PoS Testnet',
  specName: 'dock-pos-test-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 31,
  transactionVersion: 1,
};

export const DEVNODE_INFO = {
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DOCK',
  },
  // This should change whenever dev node changes
  genesis: '0x9388db55e44f5c438c0a4d3dd4c260e25261b1c79aa47c91bfd39bced0b9cc4c',
  name: 'Dock Mainnet',
  specName: 'dock-pos-dev-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 31,
  transactionVersion: 1,
};
