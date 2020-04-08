import {parse as parse_did} from 'did-resolver';
import {validateDockDIDSS58Identifier} from './utils/did';
import axios from 'axios';
import {NoDID} from './err';

export class DIDResolver {
  async resolve(did) {
    throw new Error('Resolving not implemented in base class, please extend.');
  }
}

export class DockResolver extends DIDResolver {
  /**
   * @param {dock} DockAPI - An initialized connection to a dock full-node.
   * @returns {Resolver}
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

    const parsed = parse_did(did);

    console.assert(
      parsed.method === method_name,
      `resolver for ${method_name} does not support the ${parsed.method} did method.`
    );

    validateDockDIDSS58Identifier(parsed.id);
    return this.dock.did.getDocument(parsed.did);
  }
}

export class MultiResolver extends DIDResolver {
  /**
   * Create a Resolver which delegates to the appropriate child Resolver according to an index.
   *
   * @param {object} index - A map from DID method name to child Resolver.
   * @param {Resolver | null} catchAll - An optional fallback to use when index does not specify an
   * implementation for the requested method.
   * @returns {Resolver}
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
    const method = parse_did(did).method;
    if (method in this.providers) {
      const provider = this.providers[method];
      return await this.getResolveMethod(provider)(did);
    } else if (this.catchAll) {
      return await this.getResolveMethod(this.catchAll)(did);
    } else {
      throw new Error('No resolver for did', did);
    }
  }

  getResolveMethod(provider) {
    return provider.resolve ? provider.resolve.bind(provider) : provider;
  }
}

/**
 * Create an adapter to a
 * [universal-resolver](https://github.com/decentralized-identity/universal-resolver) instance. The
 * adapter has type
 * [DIDResolver](https://github.com/decentralized-identity/did-resolver/blob/02bdaf1687151bb934b10093042e576ed54b229c/src/resolver.ts#L73).
 *
 * @param {string} url - address of an instance of universal-resolver.
 * @returns {Promise<DIDResolver>}
 */
export class UniversalResolver extends DIDResolver {
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
    // The resolver will return a 404 and 500 sometimes when the DID is not found.
    // We let that error propagate to the caller.
    let resp = await axios.get(`${this.idUrl}${did}`);
    if (resp.data === undefined || resp.data.didDocument == undefined) {
      throw new Error('Universal resolver returned invalid DID', did);
    }
    return resp.data.didDocument;
  }
}
