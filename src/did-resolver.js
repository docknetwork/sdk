import { parse } from 'did-resolver';

/**
 * A DID resolver
 * @typedef {Object} DIDResolver
 */
export default class DIDResolver {
  parseDid(did) {
    return parse(did);
  }

  async resolve() {
    throw new Error(`Resolving not implemented in base class, please extend. ${this.constructor.name}`);
  }
}
