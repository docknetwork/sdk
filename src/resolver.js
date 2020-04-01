import { Resolver as DIFResolver} from 'did-resolver';
import ethr from 'ethr-did-resolver';
import axios from 'axios';

import {DockDIDMethod} from './utils/did';
import {getResolver} from './dock-did-resolver';

// TODO: Support KILT DID

const EthrDIDMethod = 'ethr';

/** Class representing a DID Resolver which can resolve DID from various networks */
class Resolver {
  /**
   * DID resolver class, currently supporting only Dock and Ethereum DID natively and optionally allows to pass URL for the
   * universal resolver.
   * The providers can be passed only during construction to keep the code minimal.
   * @param {object} providers - An object with keys as the DID method and value as the provider config specifying the network.
   * @param {string} universalResolverUrl - The HTTP URL for the universal resolver. This is optional
   */
  constructor(providers, universalResolverUrl) {
    // If `universalResolverUrl` is passed, ensure that it is a URL
    if (universalResolverUrl) {
      try {
        new URL(universalResolverUrl);
      } catch (e) {
        throw new Error('Invalid URL given for universal resolver. Parsing resulted in the following error', e);
      }
      // Remove trailing slash if any and append the string `/1.0/identifiers/`
      this.universalResolverUrl = `${universalResolverUrl.replace(/\/$/, '')}/1.0/identifiers/`;
    }
    this.providers = {};
  }

  /***
   * Initialize the resolvers of each network
   */
  init() {
    const resolvers = {};
    if (DockDIDMethod in this.providers) {
      resolvers.dock = getResolver(this.providers[DockDIDMethod])[DockDIDMethod];
    }
    if (EthrDIDMethod in this.providers) {
      resolvers.ethr = ethr.getResolver(this.providers[EthrDIDMethod])[EthrDIDMethod];
    }
    this.resolver = new DIFResolver(resolvers);
  }

  /**
   * Resolve the given DID with either the registered providers or try to fetch from the universal resolver
   * if available.
   * @param {string} did - A full DID (with method, like did:dock:5....)
   * @returns {Promise<DIDDocument | null>} Returns a promise to the DID document
   */
  async resolve(did) {
    return this.resolver.resolve(did).catch(error => {
      if (this.universalResolverUrl) {
        return this.getFromUniversalResolver(did);
      } else {
        throw error;
      }
    });
  }

  /**
   * Try to fetch the DID from the universal resolver.
   * @param {string} did - A full DID (with method, like did:dock:5....)
   * @returns {Promise<Error|*>}
   */
  async getFromUniversalResolver(did) {
    let resp;
    try {
      // The resolver will return a 404 and 500 sometimes when the DID is not found.
      resp = await axios.get(`${this.universalResolverUrl}${did}`);
    } catch (e) {
      return new Error('Universal resolver could not find the DID', did);
    }
    if (resp.data && resp.data.didDocument) {
      return resp.data.didDocument;
    } else {
      return new Error('Universal resolver could not find the DID', did);
    }
  }
}

export {
  Resolver
};
