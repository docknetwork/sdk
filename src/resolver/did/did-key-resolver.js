import { getResolver } from 'key-did-resolver';
import DIDResolver from './did-resolver';

const resolveMethod = getResolver().key;

/**
 * Resolves `DID` keys with identifier `did:key:*`.
 */
export default class DIDKeyResolver extends DIDResolver {
  static METHOD = 'key';

  constructor() {
    super(void 0);
  }

  async resolve(did) {
    const parsed = this.parseDid(did);
    const { didDocument } = await resolveMethod(did, parsed, null, {});

    return {
      '@context': 'https://www.w3.org/ns/did/v1',
      ...didDocument,
    };
  }
}
