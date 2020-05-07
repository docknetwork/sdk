import b58 from 'bs58';
import { sha256 } from 'js-sha256';
import { ec as EC } from 'elliptic';
import { EcdsaSecp256k1VerKeyName } from './constants';
import {u8aToHex} from '@polkadot/util';
import {signatureVerify} from '@polkadot/util-crypto/signature';

const secp256k1Curve = new EC('secp256k1');

export default class EcdsaSecp256k1VerificationKey2019 {
  constructor(publicKey) {
    this.publicKey = [...publicKey];
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {EcdsaSecp256k1VerificationKey2019}
   */
  static from(verificationMethod) {
    if (verificationMethod.type !== EcdsaSecp256k1VerKeyName && !verificationMethod.publicKeyBase58) {
      throw new Error('verification method should have type Sr25519VerificationKey2020 and have the base58 public key');
    }
    return new this(b58.decode(verificationMethod.publicKeyBase58));
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
        // const hash = sha256.digest(data);
        // return secp256k1Curve.verify(hash, signature, publicKey);
        const pk = u8aToHex(publicKey);
        return signatureVerify(data, signature, pk).isValid;
      },
    };
  }
}
