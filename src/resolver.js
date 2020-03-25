import { Resolver as DIFResolver} from 'did-resolver';
import ethr from 'ethr-did-resolver';
import {DockDIDMethod} from './utils/did';

import {getResolver} from './dock-did-resolver';

// TODO: Support KILT DID

/** Class representing a DID Resolver which can resolve DID from various networks */
class Resolver {
  /**
   * DID resolver class, currently supporting only Dock and Ethereum DID. Takes the provider as argument.
   * The providers can be passed only during construction to keep the code less.
   * @param {string} dockFullNodeWsRpcUrl - Websocket RPC endpoint of a Dock full node
   * @param {object} ethrProviderConfig - A provide config specifying the network.
   */
  constructor(dockFullNodeWsRpcUrl, ethrProviderConfig) {
    this.resolverConfigs = {};
    if (dockFullNodeWsRpcUrl) {
      this.resolverConfigs.dock = {initialized: false, provider: dockFullNodeWsRpcUrl};
    }
    if (ethrProviderConfig) {
      this.resolverConfigs.ethr = {initialized: false, provider: ethrProviderConfig};
    }
  }

  /***
   * Initialize the resolvers of each network
   */
  init() {
    const resolvers = {};
    if (this.resolverConfigs.dock) {
      resolvers.dock = getResolver(this.resolverConfigs.dock.provider)[DockDIDMethod];
    }
    if (this.resolverConfigs.ethr) {
      resolvers.ethr = ethr.getResolver(this.resolverConfigs.ethr.provider)['ethr'];
    }
    this.resolver = new DIFResolver(resolvers);
  }

  /**
   * Resolve the given DID
   * @param {string} did - A full DID (with method)
   * @returns {Promise<DIDDocument | null>} Returns a promise to the DID document
   */
  async resolve(did) {
    return this.resolver.resolve(did);
  }
}

export {
  Resolver
};
