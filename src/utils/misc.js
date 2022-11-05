import elliptic from 'elliptic';
import { blake2AsHex } from '@polkadot/util-crypto';

import { sha256 } from 'js-sha256';
import {
  PublicKey, PublicKeyEd25519, PublicKeySecp256k1, PublicKeySr25519, // eslint-disable-line
} from '../public-keys';
import {
  Signature, SignatureEd25519, SignatureSecp256k1, SignatureSr25519, // eslint-disable-line
} from '../signatures';

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
export function verifyEcdsaSecp256k1SigPrehashed(messageHash, signature, publicKey) {
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
  if (type === 'ed25519') {
    Cls = SignatureEd25519;
  } else if (type === 'sr25519') {
    Cls = SignatureSr25519;
  } else {
    Cls = SignatureSecp256k1;
  }
  return new Cls(message, pair);
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
 * Convert bytes to struct `WrappedBytes` expected by chain
 * @param bytes
 * @returns {{'0'}}
 */
export function bytesToWrappedBytes(bytes) {
  return bytes;
}

/**
 * Get the nonce to be used for sending the next transaction if not provided already.
 * @param hexDid - DID whose nonce is needed
 * @param nonce - If provided, returned as it is.
 * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
 * using this
 * @returns {Promise<undefined|*>}
 */
export async function getNonce(hexDid, nonce = undefined, didModule = undefined) {
  if (nonce === undefined && didModule === undefined) {
    throw new Error('Provide either nonce or didModule to fetch nonce but none provided');
  }
  if (nonce === undefined) {
    return didModule.getNextNonceForDID(hexDid);
  }
  return nonce;
}
