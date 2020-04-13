import {parse} from 'did-resolver';
import {validateDockDIDSS58Identifier, NoDIDError} from './utils/did';
import axios from 'axios';

export class DIDResolver {
  async resolve() {
    throw new Error('Resolving not implemented in base class, please extend.');
  }

  parseDid(did) {
    return parse(did);
  }
}

export class DockResolver extends DIDResolver {
  /**
   * @param {dock} DockAPI - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(dock) {
    super();
    this.dock = dock;
  }

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @param {object} parsed - Object containing the full DID, the identifier, method
   * @returns {DIDDocument}
   */
  async resolve(did) {
    const method_name = 'dock';

    console.assert(this.dock.isInitialized());

    const parsed = this.parseDid(did);

    console.assert(
      parsed.method === method_name,
      `resolver for ${method_name} does not support the ${parsed.method} did method.`
    );

    validateDockDIDSS58Identifier(parsed.id);

    return await this.dock.did.getDocument(parsed.did);
  }
}

export class UniversalResolver extends DIDResolver {
  /**
   * Create an adapter to a
   * [universal-resolver](https://github.com/decentralized-identity/universal-resolver) instance. The
   * adapter has type
   * [DIDResolver](https://github.com/decentralized-identity/did-resolver/blob/02bdaf1687151bb934b10093042e576ed54b229c/src/resolver.ts#L73).
   * @constructor
   * @param {string} url - address of an instance of universal-resolver.
   */
  constructor(url) {
    super();
    this.url = new URL(url);

    // Remove trailing slash if any and append the string `/1.0/identifiers/`
    this.idUrl = `${url.replace(/\/$/, '')}/1.0/identifiers/`;
  }

  /**
   * Fetch the DID from the universal resolver.
   * @param {string} did - A full DID (with method, like did:uport:2nQtiQG....)
   * @returns {Promise<DIDDocument>}
   */
  async resolve(did) {
    try {
      let resp = await axios.get(`${this.idUrl}${did}`);
      return resp.data.didDocument;
    } catch (error) {
      if (error.isAxiosError && error.response.data.match(/DID not found/g)) {
        throw new NoDIDError(did);
      }

      throw error;
    }
  }
}

export class MultiResolver extends DIDResolver {
  /**
   * Create a Resolver which delegates to the appropriate child Resolver according to an index.
   * @constructor
   * @param {object} index - A map from DID method name to child Resolver.
   * @param {Resolver | null} catchAll - An optional fallback to use when index does not specify an
   * implementation for the requested method.
   */
  constructor(providers, catchAll) {
    super();
    this.providers = providers;
    this.catchAll = catchAll;
  }

  /**
   * Resolve the given DID with either the registered providers or try to fetch from the universal resolver
   * if available.
   * @param {string} did - A full DID (with method, like did:dock:5....)
   * @returns {Promise<DIDDocument>} Returns a promise to the DID document
   */
  async resolve(did) {
    const method = this.parseDid(did).method;
    const provider = this.providers[method];

    if (provider) {
      return await this.getResolveMethod(provider)(did);
    } else if (this.catchAll) {
      return await this.getResolveMethod(this.catchAll)(did);
    } else {
      throw new Error('No provider found for DID', did);
    }
  }

  getResolveMethod(provider) {
    return provider.resolve ? provider.resolve.bind(provider) : provider;
  }
}
