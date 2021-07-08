import { TypeRegistry } from '@polkadot/types';
import { getSpecTypes } from '@polkadot/types-known';
import { createMetadata } from '@substrate/txwrapper/lib/util/metadata';

import { DEVNODE_INFO, MAINNET_INFO, TESTNET_INFO } from './constants';
import { metadataRpc as devMetadata } from './devnode-metadata.json';
import { metadataRpc as mainMetadata } from './mainnet-metadata.json';
import { metadataRpc as testMetadata } from './testnet-metadata.json';

/**
 * A registry class that stores the types, metadata and chain information.
 */
export class Registry {
  constructor({ chainInfo, metadata, chainTypes }) {
    createMetadata.clear();

    const registry = new TypeRegistry();
    registry.setChainProperties(
      registry.createType(
        'ChainProperties',
        chainInfo.properties,
      ),
    );

    registry.setKnownTypes({
      types: chainTypes,
    });
    registry.register(getSpecTypes(registry, chainInfo.name, chainInfo.specName, chainInfo.specVersion));

    registry.setMetadata(createMetadata(registry, metadata));

    /* eslint-disable no-underscore-dangle */
    this._registry = registry;
    this._metadata = metadata;
    this._chainInfo = chainInfo;
  }

  get registry() {
    return this._registry;
  }

  get metadata() {
    return this._metadata;
  }

  get chainInfo() {
    return this._chainInfo;
  }

  get optionsMeta() {
    return { metadataRpc: this._metadata, registry: this._registry };
  }
}

export function getMainnetRegistry() {
  // @ts-ignore
  return new Registry({ chainInfo: MAINNET_INFO, metadata: mainMetadata });
}

export function getTestnetRegistry() {
  // @ts-ignore
  return new Registry({ chainInfo: TESTNET_INFO, metadata: testMetadata });
}

export function getDevnodeRegistry() {
  // @ts-ignore
  return new Registry({ chainInfo: DEVNODE_INFO, metadata: devMetadata });
}
