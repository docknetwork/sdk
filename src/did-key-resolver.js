import { getResolver } from 'key-did-resolver';
import DIDResolver from './did-resolver';

const methodName = 'key';
const resolveMethod = getResolver().key;

export default class DIDKeyResolver extends DIDResolver {
  /**
   * Resolve a did:key DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @returns {Promise<object>}
   */
  async resolve(did) {
    const parsed = this.parseDid(did);
    if (parsed.method === methodName) {
      const { didDocument } = await resolveMethod(did, parsed, null, {});
      return {
        '@context': 'https://www.w3.org/ns/did/v1',
        ...didDocument,
      };
    }
    throw new Error(`Resolver for ${methodName} does not support the ${parsed.method} did method.`);
  }
}
