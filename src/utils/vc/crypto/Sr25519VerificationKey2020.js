import b58 from 'bs58';
import * as base64 from '@juanelas/base64';
import { u8aToU8a } from '@polkadot/util';
import { sr25519Verify } from '@polkadot/util-crypto/sr25519';
import { Sr25519VerKeyName } from './constants';

export default class Sr25519VerificationKey2020 {
  constructor(publicKey) {
    this.publicKey = u8aToU8a(publicKey);
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {Sr25519VerificationKey2020}
   */
  static from(verificationMethod) {
    if (!verificationMethod.type || verificationMethod.type.indexOf(Sr25519VerKeyName) === -1) {
      throw new Error(`verification method should have type ${Sr25519VerKeyName} - got: ${verificationMethod.type}`);
    }

    if (verificationMethod.publicKeyBase58) {
      return new this(b58.decode(verificationMethod.publicKeyBase58));
    }

    if (verificationMethod.publicKeyBase64) {
      return new this(base64.decode(verificationMethod.publicKeyBase64));
    }

    throw new Error(`Unsupported signature encoding for ${Sr25519VerKeyName}`);
  }

  /**
   * Construct the verifier factory that has the verify method using the current public key
   * @returns {object}
   */
  verifier() {
    return Sr25519VerificationKey2020.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {object}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({ data, signature }) {
        return sr25519Verify(data, signature, publicKey);
      },
    };
  }
}
