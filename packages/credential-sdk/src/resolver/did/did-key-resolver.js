import { getResolver } from 'key-did-resolver';
import { Resolver } from '../generic';
import { encodeAsBase58, parseDIDUrl } from '../../utils';
import { DidMethodKey } from '../../types/did';
import {
  Bls12381BBS23DockVerKeyName,
  Bls12381BBSDockVerKeyName,
} from '../../vc/crypto';

const resolveMethod = getResolver().key;

/**
 * Resolves `DID` keys with identifier `did:key:*`.
 */
export default class DIDKeyResolver extends Resolver {
  prefix = 'did';

  method = 'key';

  constructor() {
    super(void 0);
  }

  async resolve(did) {
    const parsed = parseDIDUrl(did);
    const canonicalDid = parsed.did;

    try {
      const { didDocument } = await resolveMethod(did, parsed, null, {});
      if (didDocument == null) {
        throw new Error(`Unable to resolve \`${did}\``);
      }

      return {
        '@context': 'https://www.w3.org/ns/did/v1',
        ...didDocument,
      };
    } catch (error) {
      let didMethodKey;
      try {
        didMethodKey = DidMethodKey.from(canonicalDid).didMethodKey;
      } catch {
        throw error;
      }

      if (!didMethodKey.isBbs && !didMethodKey.isBbsPlus) {
        throw error;
      }

      const verificationMethodType = didMethodKey.isBbs
        ? Bls12381BBS23DockVerKeyName
        : Bls12381BBSDockVerKeyName;
      const publicKeyMultibase = didMethodKey.toEncodedString();
      const verificationMethodId = `${canonicalDid}#${publicKeyMultibase}`;
      const publicKeyBase58 = encodeAsBase58(didMethodKey.value.bytes);

      return {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: canonicalDid,
        verificationMethod: [
          {
            id: verificationMethodId,
            type: verificationMethodType,
            controller: canonicalDid,
            publicKeyBase58,
          },
        ],
        authentication: [verificationMethodId],
        assertionMethod: [verificationMethodId],
        capabilityInvocation: [verificationMethodId],
        capabilityDelegation: [verificationMethodId],
      };
    }
  }
}
