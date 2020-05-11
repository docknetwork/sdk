import { ec as EC } from 'elliptic';

import {
  PublicKey, PublicKeyEd25519, PublicKeySecp256k1, PublicKeySr25519, // eslint-disable-line
} from '../public-keys';
import {
  Signature, SignatureEd25519, SignatureSecp256k1, SignatureSr25519, // eslint-disable-line
} from '../signatures';

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
 * @param {string} pers - A string
 * @param {array} entropy - A byte array or hex string
 * @returns {object} A keypair
 */
export function generateEcdsaSecp256k1Keypair(pers, entropy) {
  return secp256k1Curve.genKeyPair({ pers, entropy });
}

/**
 * Verify a given signature on a given message
 * @param {array} message - Bytes of message
 * @param {SignatureSecp256k1} signature - signature to verify
 * @param {PublicKeySecp256k1} publicKey - Secp256k1 public key for verification
 * @returns {boolean} True when signature is valid, false otherwise
 */
export function verifyEcdsaSecp256k1Sig(message, signature, publicKey) {
  // Remove the leading `0x`
  const sigHex = signature.value.slice(2);
  // Break it in 2 chunks of 32 bytes each
  const sig = { r: sigHex.slice(0, 64), s: sigHex.slice(64, 128) };
  // Remove the leading `0x`
  const pkHex = publicKey.value.slice(2);
  // Generate public key object. Not extracting the public key for signature as the verifier
  // should always know what public key is being used.
  const pk = secp256k1Curve.keyFromPublic(pkHex, 'hex');
  return secp256k1Curve.verify(message, sig, pk);
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of PublicKey.
 * @param {object} pair - A polkadot-js KeyringPair.
 * @return {PublicKey} An instance of the correct subclass of PublicKey
 */
export function getPublicKeyFromKeyringPair(pair) {
  switch (pair.type) {
    case 'ed25519':
      return PublicKeyEd25519.fromKeyringPair(pair);
    case 'sr25519':
      return PublicKeySr25519.fromKeyringPair(pair);
    case 'ecdsa':
      return PublicKeySecp256k1.fromKeyringPair(pair);
    default:
      throw new Error('Only ed25519, sr25519 and secp256k1 keys supported as of now');
  }
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of Signature.
 * @param {object} pair - A polkadot-js KeyringPair.
 * @param {array} message - an array of bytes (Uint8)
 * @returns {Signature} An instance of the correct subclass of Signature
 */
export function getSignatureFromKeyringPair(pair, message) {
  switch (pair.type) {
    case 'ed25519':
      return new SignatureEd25519(message, pair);
    case 'sr25519':
      return new SignatureSr25519(message, pair);
    case 'ecdsa':
      return new SignatureSecp256k1(message, pair);
    default:
      throw new Error('Only ed25519, sr25519 and secp256k1 keys supported as of now');
  }
}
