import b58 from 'bs58';
import * as base64 from '@juanelas/base64';
import { u8aToU8a } from '../../utils/types/bytes';
import { EcdsaSecp256k1VerKeyName } from './constants';
import Secp256k1Keypair from '../../keypairs/keypair-secp256k1';
import { decodeFromMultibase } from '../../utils/encoding/multibase';

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
    if (
      !verificationMethod.type
      || verificationMethod.type.indexOf(EcdsaSecp256k1VerKeyName) === -1
    ) {
      throw new Error(
        `verification method should have type ${EcdsaSecp256k1VerKeyName} - got: ${verificationMethod.type}`,
      );
    }

    if (verificationMethod.publicKeyBase58) {
      return new this(b58.decode(verificationMethod.publicKeyBase58));
    }

    if (verificationMethod.publicKeyBase64) {
      return new this(base64.decode(verificationMethod.publicKeyBase64));
    }

    const secMultibase = verificationMethod['sec:publicKeyMultibase'];
    const multiBase = verificationMethod.publicKeyMultibase || (
      typeof secMultibase === 'object'
        ? secMultibase['@value']
        : secMultibase
    );

    if (multiBase) {
      return new this(decodeFromMultibase(multiBase).slice(2));
    }

    throw new Error(
      `Unsupported signature encoding for ${EcdsaSecp256k1VerKeyName}`,
    );
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
        return Secp256k1Keypair.verify(data, signature, publicKey);
      },
    };
  }
}
