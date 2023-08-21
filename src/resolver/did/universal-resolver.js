import axios from 'axios';
import { NoDIDError } from '../../utils/did';
import { Resolver, WILDCARD } from '../generic';

/**
 * Resolves `DID`s with wildcard method: `did:*:`.
 */
export default class UniversalResolver extends Resolver {
  static PREFIX = 'did';
  static METHOD = WILDCARD;

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
   * @returns {Promise<object>}
   */
  async resolve(did) {
    const hashIndex = did.indexOf('#');
    const encodedDid = encodeURIComponent(
      hashIndex === -1 ? did : did.slice(0, hashIndex).trim(),
    );
    try {
      const resp = await axios.get(`${this.idUrl}${encodedDid}`, {
        headers: {
          Accept:
            'application/ld+json;profile="https://w3id.org/did-resolution"',
        },
      });

      // Sometimes didDocument doesnt exist, if so return data as document
      return resp.data.didDocument || resp.data;
    } catch (error) {
      if (error.isAxiosError) {
        throw new NoDIDError(did);
      }

      throw error;
    }
  }
}
