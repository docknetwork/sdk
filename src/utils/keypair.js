import { randomAsHex } from '@polkadot/util-crypto';
import elliptic from 'elliptic';
import {
  PublicKeyEd25519,
  PublicKeySr25519,
  PublicKeySecp256k1,
  getKeyPairType, // eslint-disable-line
} from '../public-keys';
import {
  SignatureEd25519,
  SignatureSecp256k1,
  SignatureSr25519, // eslint-disable-line
} from '../signatures';
import {
  EcdsaSecp256k1VerKeyName,
  Ed25519VerKeyName,
  Sr25519VerKeyName,
} from './vc/custom_crypto';

const EC = elliptic.ec;
const secp256k1Curve = new EC('secp256k1');

/**
 * Wrapped keypair used to interact with the dock blockchain.
 */
export class DockKeypair {
  /**
   * Wraps supplied keypair into a `DockKeypair`.
   *
   * @param {*} keyPair
   */
  constructor(keyPair) {
    this.keyPair = keyPair;
    this.verKeyType = getVerKeyTypeForKeypair(keyPair);
  }

  /**
   * Returns underlying public key.
   */
  publicKey() {
    return getPublicKeyFromKeyringPair(this.keyPair);
  }

  /**
   * Signs supplied message using underlying keypair.
   * @param {*} message
   */
  sign(message) {
    return getSignatureFromKeyringPair(this.keyPair, message);
  }

  /**
   * Generates random `Secp256k1` keypair.
   *
   * @param params
   * @returns {this}
   */
  static randomSecp256k1() {
    return new this(generateEcdsaSecp256k1Keypair(randomAsHex(32)));
  }
}

/**
 * Return the crypto type of the verification key for the given keypair.
 * @param {object} pair - Can be a keypair from polkadot-js or elliptic library.
 * @returns {string|*}
 */
export function getVerKeyTypeForKeypair(pair) {
  const ty = getKeyPairType(pair);

  switch (ty) {
    case 'ed25519':
      return Ed25519VerKeyName;
    case 'sr25519':
      return Sr25519VerKeyName;
    case 'secp256k1':
      return EcdsaSecp256k1VerKeyName;
    default:
      throw new Error(`Unsupported key type: \`${ty}\``);
  }
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of PublicKey.
 * @param {object} pair - A polkadot-js KeyringPair.
 * @return {PublicKey} An instance of the correct subclass of PublicKey
 */
export function getPublicKeyFromKeyringPair(pair) {
  const type = getKeyPairType(pair);
  let Cls;
  if (type === 'ed25519') {
    Cls = PublicKeyEd25519;
  } else if (type === 'sr25519') {
    Cls = PublicKeySr25519;
  } else {
    Cls = PublicKeySecp256k1;
  }
  return Cls.fromKeyringPair(pair);
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of Signature.
 * @param {object} pair - A polkadot-js KeyringPair.
 * @param {array} message - an array of bytes (Uint8)
 * @returns {Signature} An instance of the correct subclass of Signature
 */
export function getSignatureFromKeyringPair(pair, message) {
  const type = getKeyPairType(pair);

  let Cls;
  switch (type) {
    case 'ed25519':
      Cls = SignatureEd25519;
      break;
    case 'sr25519':
      Cls = SignatureSr25519;
      break;
    case 'secp256k1':
      Cls = SignatureSecp256k1;
      break;
    default:
      throw new Error(`Unsupported keypair type: \`${type}\``);
  }

  return Cls.signWithKeyringPair(message, pair);
}

/**
 * Generate keypair for Ecdsa over Secp256k1. Explicitly denying other options to keep the API simple
 * @param {string} [pers] - A string
 * @param {array|string} [entropy] - A byte array or hex string
 * @returns {object} A keypair
 */

export function generateEcdsaSecp256k1Keypair(entropy = null) {
  return secp256k1Curve.genKeyPair({ entropy });
}
