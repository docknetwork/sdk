/* eslint-disable max-classes-per-file */
import elliptic from 'elliptic';
import { blake2AsHex, randomAsHex } from '@polkadot/util-crypto';

import { sha256 } from 'js-sha256';
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519, // eslint-disable-line
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
import { PatternMatcher } from './generic';

const EC = elliptic.ec;
const secp256k1Curve = new EC('secp256k1');

/** // TODO: Error handling when `stateChange` is not registered
 * Helper function to return bytes of a `StateChange` enum. Updates like key change, DID removal, revocation, etc
 * require the change to be wrapped in `StateChange` before serializing for signing.
 * @param {object} api - Promise API from polkadot-js
 * @param {object} stateChange - A representation of a `StateChange` enum variant
 * @return {array} An array of Uint8
 */
export function getBytesForStateChange(api, stateChange) {
  return api.createType('StateChange', stateChange).toU8a();
}

export function getStateChange(api, name, value) {
  const stateChange = {};
  stateChange[name] = value;
  return getBytesForStateChange(api, stateChange);
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

/**
 * Verify a given signature on a given message
 * @param {array} message - Bytes of message. Its assumed that the message is not hashed already
 * and hashed before verifying
 * @param {SignatureSecp256k1} signature - signature to verify
 * @param {PublicKeySecp256k1} publicKey - Secp256k1 public key for verification
 * @returns {boolean} True when signature is valid, false otherwise
 */
export function verifyEcdsaSecp256k1Sig(message, signature, publicKey) {
  const hash = sha256.digest(message);
  return verifyEcdsaSecp256k1SigPrehashed(hash, signature, publicKey);
}

/**
 * Verify a given signature on a given message hash
 * @param {array} messageHash - Hash of the message. Its assumed that the message is hashed already
 * @param {SignatureSecp256k1} signature - signature to verify
 * @param {PublicKeySecp256k1} publicKey - Secp256k1 public key for verification
 * @returns {boolean} True when signature is valid, false otherwise
 */
export function verifyEcdsaSecp256k1SigPrehashed(
  messageHash,
  signature,
  publicKey,
) {
  // Remove the leading `0x`
  const sigHex = signature.value.slice(2);
  // Break it in 2 chunks of 32 bytes each
  const sig = { r: sigHex.slice(0, 64), s: sigHex.slice(64, 128) };
  // Remove the leading `0x`
  const pkHex = publicKey.value.slice(2);
  // Generate public key object. Not extracting the public key for signature as the verifier
  // should always know what public key is being used.
  const pk = secp256k1Curve.keyFromPublic(pkHex, 'hex');
  return secp256k1Curve.verify(messageHash, sig, pk);
}

/**
 * Return the type of signature from a given keypair
 * @param {object} pair - Can be a keypair from polkadot-js or elliptic library.
 * @returns {string|*}
 */
export function getKeyPairType(pair) {
  if (pair.type) {
    return pair.type;
  }

  if (pair.ec && pair.priv) {
    // elliptic library's pair has `ec`, `priv` and `pub`. There is not a cleaner way to detect that
    return 'secp256k1';
  }
  throw new Error('Cannot detect key pair type');
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

  return new Cls(message, pair);
}

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
 * Get unique elements from an array as seen by the filterCallback function.
 * @param {array} a - Array to check for duplicates.
 * @param {function} filterCallback - Elements will be fed to this function before comparison.
 * @returns {*}
 */
export function getUniqueElementsFromArray(a, filterCallback) {
  const seen = new Set();
  return a.filter((item) => {
    const k = filterCallback(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

/**
 * Encodes an extrinsic as a blake2 hash
 * @param {*} api - API for creating Call type
 * @param {*} tx - Extrinsic to encode
 * @returns {string}
 */
export function encodeExtrinsicAsHash(api, tx) {
  return blake2AsHex(api.createType('Call', tx).toU8a());
}

/**
 * Get the nonce to be used for sending the next transaction if not provided already.
 * @param {DockDidOrDidMethodKey} didOrDidMethodKey - DID whose nonce is needed
 * @param nonce - If provided, returned as it is.
 * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
 * using this
 * @returns {Promise<undefined|*>}
 */
export async function getDidNonce(
  didOrDidMethodKey,
  nonce = undefined,
  didModule = undefined,
) {
  if (nonce === undefined && didModule === undefined) {
    throw new Error(
      'Provide either nonce or didModule to fetch nonce but none provided',
    );
  }
  if (nonce === undefined) {
    return didModule.getNextNonceForDid(didOrDidMethodKey);
  }
  return nonce;
}

/**
   * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
   *
   * @param pattern
   * @param value
   */
export const ensureMatchesPattern = (pattern, value) => new PatternMatcher().check(pattern, value);

/**
 * Get a list of numbers in the range [start, stop], i.e. both are inclusive. Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
 * @param start
 * @param stop
 * @param step
 * @returns {number[]}
 */
export const inclusiveRange = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
