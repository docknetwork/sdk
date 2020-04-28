import { parse } from 'did-resolver';

/**
 * A DID resolver
 */
export default class DIDResolver {
  parseDid(did) {
    return parse(did);
  }

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @param {object} parsed - Object containing the full DID, the identifier, method
   * @returns {DIDDocument}
   */
  async resolve(did) {
    throw new Error(`Resolving not implemented in base class, please extend. ${this.constructor.name} ${did}`);
  }
}
