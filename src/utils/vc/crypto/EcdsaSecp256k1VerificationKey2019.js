import b58 from 'bs58';
import * as base64 from '@juanelas/base64';
import { u8aToU8a } from '@polkadot/util';
import { sha256 } from 'js-sha256';
import elliptic from 'elliptic';
import { EcdsaSecp256k1VerKeyName } from './constants';

const EC = elliptic.ec;
const secp256k1Curve = new EC('secp256k1');

export default class EcdsaSecp256k1VerificationKey2019 {
  constructor(publicKey) {
    this.publicKey = u8aToU8a(publicKey);
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {EcdsaSecp256k1VerificationKey2019}
   */
  static from(verificationMethod) {
    if (!verificationMethod.type || verificationMethod.type.indexOf(EcdsaSecp256k1VerKeyName) === -1) {
      throw new Error(`verification method should have type ${EcdsaSecp256k1VerKeyName} - got: ${verificationMethod.type}`);
    }

    if (verificationMethod.publicKeyBase58) {
      return new this(b58.decode(verificationMethod.publicKeyBase58));
    }

    if (verificationMethod.publicKeyBase64) {
      return new this(base64.decode(verificationMethod.publicKeyBase64));
    }

    throw new Error(`Unsupported signature encoding for ${EcdsaSecp256k1VerKeyName}`);
  }

  /**
   * Construct the verifier factory that has the verify method using the current public key
   * @returns {object}
   */
  verifier() {
    return EcdsaSecp256k1VerificationKey2019.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {object}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({ data, signature }) {
        const hash = sha256.digest(data);
        return secp256k1Curve.verify(hash, signature, publicKey);
      },
    };
  }
}
