import { Resolver } from 'did-resolver';
import ethr from 'ethr-did-resolver';
import {connect} from '@kiltprotocol/sdk-js';

import {getResolver} from './dock-did-resolver';

class Resolver {
  constructor(dockFullNodeWsRpcUrl, ethrProviderConfig, kiltFullNodeWsRpcUrl) {
    // Only one endpoint is supported for dock and kilt
    this.resolverConfigs = {};

    if (dockFullNodeWsRpcUrl) {
      this.resolverConfigs.dock = {initialized: false, provider: dockFullNodeWsRpcUrl};
    }
    if (ethrProviderConfig) {
      this.resolverConfigs.ethr = {initialized: false, provider: ethrProviderConfig};
    }
    if (kiltFullNodeWsRpcUrl) {
      this.resolverConfigs.kilt = {initialized: false, provider: kiltFullNodeWsRpcUrl};
    }
  }

  async init() {
    let resolvers = {};
    if (this.resolverConfigs.dock) {
      resolvers.dock = getResolver(this.resolverConfigs.dock.provider);
    }
    if (this.resolverConfigs.ethr) {
      resolvers.ethr = ethr.getResolver(this.resolverConfigs.ethr.provider);
    }
    this.resolver = new Resolver(resolvers);
  }

  async resolve(did) {
    if (did.startsWith('did:kilt')) {
      // Kilt does not have a resolver published yet.
      return this.resolveKiltDid(did)
    } else {
      return this.resolver.resolve(did);
    }
  }

  async resolveKiltDid(did) {

  }
}
