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
  genesis: '0xf73467c6544aa68df2ee546b135f955c46b90fa627e9b5d7935f41061bb8a5a9',
  name: 'Dock Mainnet',
  specName: 'dock-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 24,
  transactionVersion: 1,
};

export const TESTNET_INFO = {
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0xd3ed57c8ce8744c0c581c7c3ea168553aa0fd208b2fc3c6c25d24f7f344d8b4a',
  name: 'Poa Testnet',
  specName: 'dock-testnet',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 24,
  transactionVersion: 1,
};

export const DEVNODE_INFO = {
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  // This should change whenever dev node changes
  genesis: '0x956cd95ad4baf709e851e0fce555bffa5ae2933851cadfaeeb13fe68fa74dfc5',
  name: 'Dock Mainnet',
  specName: 'dock-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 24,
  transactionVersion: 1,
};
