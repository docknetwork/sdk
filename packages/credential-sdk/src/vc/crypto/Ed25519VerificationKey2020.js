import b58 from 'bs58';
import * as base64 from '@juanelas/base64';
import { Ed25519VerKeyName, Ed255192020VerKeyName } from './constants';
import Ed25519VerificationKey2018 from './Ed25519VerificationKey2018';

export default class Ed25519VerificationKey2020 extends Ed25519VerificationKey2018 {
  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {Ed25519VerificationKey2020}
   */
  static from(verificationMethod) {
    const isEd25519Type = verificationMethod.type.indexOf(Ed255192020VerKeyName) !== -1
      || verificationMethod.type.indexOf(Ed25519VerKeyName) !== -1;
    if (!verificationMethod.type || !isEd25519Type) {
      throw new Error(
        `verification method should have type ${Ed255192020VerKeyName} - got: ${verificationMethod.type}`,
      );
    }

    if (verificationMethod.publicKeyBase58) {
      return new this(b58.decode(verificationMethod.publicKeyBase58));
    }

    if (verificationMethod.publicKeyBase64) {
      return new this(base64.decode(verificationMethod.publicKeyBase64));
    }

    throw new Error(
      `Unsupported signature encoding for ${Ed255192020VerKeyName}`,
    );
  }

  // NOTE: Ed255192020 has the same cryptography as Ed255192018, so we inherit the verifier methods
}
