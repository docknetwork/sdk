import { getDidJwkResolver } from '@sphereon/ssi-sdk-ext.did-resolver-jwk';
import DIDResolver from './did-resolver';

const jwkResolver = getDidJwkResolver();

export default class DIDJWKResolver extends DIDResolver {
  static METHOD = 'jwk';

  constructor() {
    super(undefined);
  }

  async resolve(did) {
    const { didDocument } = await jwkResolver.jwk(did);
    return {
      '@context': 'https://www.w3.org/ns/did/v1',
      ...didDocument,
    };
  }
}
