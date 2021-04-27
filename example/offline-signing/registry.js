import { TypeRegistry } from '@polkadot/types';
import { getSpecTypes } from '@polkadot/types-known';
import { createMetadata } from '@substrate/txwrapper/lib/util/metadata';

import types from '../types.json';
import { DEVNODE_INFO, MAINNET_INFO } from './constants';
import { metadataRpc as devMetadata } from './devnode-metadata.json';
import { metadataRpc as mainMetadata } from './mainnet-metadata.json';

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
      types: chainTypes || types,
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
}

export function getMainnetRegistry() {
  // @ts-ignore
  return new Registry({ chainInfo: MAINNET_INFO, metadata: mainMetadata });
}

export function getDevnodeRegistry() {
  // @ts-ignore
  return new Registry({ chainInfo: DEVNODE_INFO, metadata: devMetadata });
}
