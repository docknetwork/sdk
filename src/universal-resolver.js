import axios from 'axios';
import { NoDIDError } from './utils/did';
import DIDResolver from './did-resolver';

export default class UniversalResolver extends DIDResolver {
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
      const resp = await axios.get(`${this.idUrl}${did}`);
      return resp.data.didDocument;
    } catch (error) {
      if (error.isAxiosError && error.response.data.match(/DID not found/g)) {
        throw new NoDIDError(did);
      }

      throw error;
    }
  }
}
