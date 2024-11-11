import { getDidJwkResolver } from '@sphereon/ssi-sdk-ext.did-resolver-jwk';
import { Resolver } from '../generic';

const jwkResolver = getDidJwkResolver();

/**
 * Resolves `DID` keys with identifier `did:jwk:*`.
 */
export default class DIDJWKResolver extends Resolver {
  prefix = 'did';

  method = 'jwk';

  constructor() {
    super(void 0);
  }

  async resolve(did) {
    const { didDocument } = await jwkResolver.jwk(did);
    return {
      '@context': 'https://www.w3.org/ns/did/v1',
      ...didDocument,
    };
  }
}
