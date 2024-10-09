import { DockDIDQualifier } from '../constants';
import { decodeFromSS58, encodeAsSS58, isHex } from '../../../../utils';
import { withQualifier, TypedBytes, sized } from '../../../generic';

/**
 * `did:dock:*`
 */
export default class DockDidValue extends sized(withQualifier(TypedBytes)) {
  static Qualifier = DockDIDQualifier;

  static Type = 'did';

  static Size = 32;

  static fromUnqualifiedString(did) {
    return new this(isHex(did) ? did : decodeFromSS58(did));
  }

  /**
   * Returns unqualified DID encoded as a `SS58` address.
   */
  toEncodedString() {
    return encodeAsSS58(this.value);
  }

  signWith(keyPair, bytes) {
    return {
      didSignature: {
        did: this,
        keyId: keyPair.keyId,
        sig: keyPair.sign(bytes),
      },
    };
  }
}
