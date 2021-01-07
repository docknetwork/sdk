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
  specVersion: 19,
  transactionVersion: 1,
};

export const TESTNET_INFO = {
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0x3f0608444cf5d7eec977430483ffef31ff86dfa6bfc6d7114023ee80cc03ea3f',
  name: 'Poa Testnet',
  specName: 'dock-testnet',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 17,
  transactionVersion: 1,
};

export const DEVNODE_INFO = {
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0x956cd95ad4baf709e851e0fce555bffa5ae2933851cadfaeeb13fe68fa74dfc5',
  name: 'Dock Mainnet',
  specName: 'dock-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 19,
  transactionVersion: 1,
};
