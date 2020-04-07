// andrews work:
import {parse as parse_did} from 'did-resolver';
import {validateDockDIDSS58Identifier} from './utils/did';
import axios from 'axios';
import {NoDID} from './err';

// A Resolver is simply a function taking a did uri as an argument and returning a Promise of a
// DID document.
//
// In typescript we would say:
//
// ```
// type Resolver = (did: string) => Promise<DIDDocument>
// ```
//
// If the lookup is successful but the document does not exist, Resolvers must throw NoDID.

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
   * @returns {Promise<DIDDocument>} Returns a promise to the DID document
   */
  async function resolve(did) {
    const method = parse_did(did).method;
    if (method in index) {
      return await index[method](did);
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
 * @param {string} url - address of an instance of universal-resolver.
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


























// import { Resolver as DIFResolver} from 'did-resolver';
// import ethr from 'ethr-did-resolver';
// import axios from 'axios';
//
// import {DockDIDMethod} from './utils/did';
// import {getResolver} from './dock-did-resolver';
//
// // TODO: Support KILT DID
//
// const EthrDIDMethod = 'ethr';
//
// const supportedDIDMethods = [DockDIDMethod, EthrDIDMethod];
//
// /** Class representing a DID Resolver which can resolve DID from various networks */
// export default class Resolver {
//   /**
//    * DID resolver class, currently supporting only Dock and Ethereum DID natively and optionally allows to pass URL for the
//    * universal resolver.
//    * The providers can be passed only during construction to keep the code minimal.
//    * @param {object} providers - An object with keys as the DID method and value as the provider config specifying the network.
//    * @param {string} universalResolverUrl - The HTTP URL for the universal resolver. This is optional
//    */
//   constructor(providers, universalResolverUrl) {
//     // If `universalResolverUrl` is passed, ensure that it is a URL
//     if (universalResolverUrl) {
//       new URL(universalResolverUrl);
//       // Remove trailing slash if any and append the string `/1.0/identifiers/`
//       this.universalResolverUrl = `${universalResolverUrl.replace(/\/$/, '')}/1.0/identifiers/`;
//     }
//     this.providers = {};
//     for (const method in providers) {
//       // XXX: Only 2 DID methods now so including array. A better alternative would be to make `supportedDIDMethods` a set and check for set
//       // difference of Object.keys(providers) and supportedDIDMethods
//       if (supportedDIDMethods.includes(method)) {
//         this.providers[method] = providers[method];
//       } else {
//         let msg = `DID method ${method} is not supported natively.`;
//         if (universalResolverUrl) {
//           msg += ' Will be looked up through the universal resolver.';
//         }
//         console.warn(msg);
//       }
//     }
//   }
//
//   /***
//    * Initialize the resolvers of each network
//    */
//   init() {
//     const resolvers = {};
//     if (DockDIDMethod in this.providers) {
//       resolvers.dock = getResolver(this.providers[DockDIDMethod])[DockDIDMethod];
//     }
//     if (EthrDIDMethod in this.providers) {
//       resolvers.ethr = ethr.getResolver(this.providers[EthrDIDMethod])[EthrDIDMethod];
//     }
//     this.resolver = new DIFResolver(resolvers);
//   }
//
//   /**
//    * Resolve the given DID with either the registered providers or try to fetch from the universal resolver
//    * if available.
//    * @param {string} did - A full DID (with method, like did:dock:5....)
//    * @returns {Promise<DIDDocument | null>} Returns a promise to the DID document
//    */
//   async resolve(did) {
//     return this.resolver.resolve(did).catch(error => {
//       if (this.universalResolverUrl) {
//         return this.getFromUniversalResolver(did);
//       } else {
//         throw error;
//       }
//     });
//   }
//
//   /**
//    * Try to fetch the DID from the universal resolver.
//    * @param {string} did - A full DID (with method, like did:dock:5....)
//    * @returns {Promise<Error|*>}
//    */
//   async getFromUniversalResolver(did) {
//     let resp;
//     try {
//       // The resolver will return a 404 and 500 sometimes when the DID is not found.
//       resp = await axios.get(`${this.universalResolverUrl}${did}`);
//     } catch (e) {
//       return new Error('Universal resolver could not find the DID', did);
//     }
//     if (resp.data && resp.data.didDocument) {
//       return resp.data.didDocument;
//     } else {
//       return new Error('Universal resolver could not find the DID', did);
//     }
//   }
// }
