import {parse as parse_did} from 'did-resolver';
import {validateDockDIDSS58Identifier} from './utils/did';
import axios from 'axios';

/**
 * Create a Resolver which delegates to the appropriate child Resolver according to an index.
 *
 * @param {object} index - A map from DID method name to child Resolver.
 * @param {Resolver | null} catchAll - An optional fallback to use when index does not specify an
 * implementation for the requested method.
 * @returns {Resolver}
 */
function multiResolver(index, catchAll) {
  /**
   * Resolve the given DID with either the registered providers or try to fetch from the universal resolver
   * if available.
   * @param {string} did - A full DID (with method, like did:dock:5....)
   * @returns {Promise<DIDDocument | null>} Returns a promise to the DID document
   */
  async function resolve(did) {
    const pdid = parse_did(did);
    if (pdid.method in index) {
      return await index[pdid.method](did, pdid);
    } else if (catchAll !== undefined) {
      return await catchAll(did);
    } else {
      throw new Error('no resolver for did', did);
    }
  }

  return resolve;
}

/**
 * Create an adapter to a
 * [universal-resolver](https://github.com/decentralized-identity/universal-resolver) instance. The
 * adapter has type
 * [DIDResolver](https://github.com/decentralized-identity/did-resolver/blob/02bdaf1687151bb934b10093042e576ed54b229c/src/resolver.ts#L73).
 *
 * @param {string} url - address of a instance.
 * @returns {Promise<DIDResolver>}
 */
function universalResolver(url) {
  // assert url is valid
  new URL(url);

  // Remove trailing slash if any and append the string `/1.0/identifiers/`
  const universalResolverUrl = `${url.replace(/\/$/, '')}/1.0/identifiers/`;

  /**
   * Fetch the DID from the universal resolver.
   * @param {string} did - A full DID (with method, like did:uport:2nQtiQG....)
   * @returns {Promise<DIDDocument>}
   */
  async function resolve(did) {
    // The resolver will return a 404 and 500 sometimes when the DID is not found.
    // We let that error propagate to the caller.
    let resp = await axios.get(`${universalResolverUrl}${did}`);
    if (resp.data === undefined || resp.data.didDocument == undefined) {
      throw new Error('Universal resolver returned invalid DID', did);
    }
    return resp.data.didDocument;
  }

  return resolve;
}

/**
 * @param {dock} DockAPI - An initialized connection to a dock full-node.
 * @returns {Resolver}
 */
function dockResolver(dock) {
  const method_name = 'dock';
  console.assert(dock.isInitialized());

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @param {object} parsed - Object containing the full DID, the identifier, method
   * @returns {DIDDocument}
   */
  async function resolve(did) {
    const parsed = parse_did(did);
    console.assert(
      parsed.method === method_name,
      `resolver for ${method_name} does not support the ${parsed.method} did method.`
    );
    validateDockDIDSS58Identifier(parsed.id);
    return dock.did.getDocument(parsed.did);
  }

  return resolve;
}

export {
  multiResolver,
  universalResolver,
  dockResolver,
};
