import {ec as EC} from 'elliptic';

import {PublicKeyEd25519, PublicKeySr25519, PublicKeySecp256k1} from '../public-key';
import {SignatureEd25519, SignatureSr25519, SignatureSecp256k1} from '../signature';

const secp256k1Curve = new EC('secp256k1');

/**
 * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
 * @param {string} value - Hexadecimal value
 * @param {number} byteSize - Expected byte size of the input.
 * @return {Boolean} True if hex (with given size) else false
 */
export function isHexWithGivenByteSize(value, byteSize) {
  const match = value.match(/^0x([0-9a-f]+$)/i);
  if (match && match.length > 1) {
    if (byteSize) {
      // 2 hex digits make a byte
      return match[1].length === (2 * byteSize);
    } else {
      // Don't care about byte size of the match but it must be full byte
      return (match[1].length % 2) === 0;
    }
  } else {
    return false;
  }
}

/** // TODO: Error handling when `stateChange` is not registered
 * Helper function to return bytes of a `StateChange` enum. Updates like key change, DID removal, revocation, etc
 * require the change to be wrapped in `StateChange` before serializing for signing.
 * @param {ApiPromise} api - Promise API from polkadot-js
 * @param {object} stateChange - A representation of a `StateChange` enum variant
 * @return {array} An array of Uint8
 */
export function getBytesForStateChange(api, stateChange) {
  return api.createType('dock::StateChange', stateChange).toU8a();
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
 * @returns {Keypair} A keypair
 */
export function generateEcdsaSecp256k1Keypair(pers, entropy) {
  return secp256k1Curve.genKeyPair({pers, entropy});
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
 * Return the type of signature from a given keypair
 * @param {object} pair - Can be a keypair from polkadot-js or elliptic library.
 * @returns {string|*} For now, it can be ed25519 or sr25519 or secp256k1 or an error
 */
export function getKeyPairType(pair) {
  if (pair.type && (pair.type === 'ed25519' || pair.type === 'sr25519')) {
    // Polkadot-js keyring has type field with value either 'ed25519' or 'sr25519'
    return pair.type;
  } else if (pair.ec && pair.priv) {
    // elliptic library's pair has `ec`, `priv` and `pub`. There is not a cleaner way to detect that
    return 'secp256k1';
  } else {
    throw new Error('Only ed25519, sr25519 and secp256k1 keys supported as of now');
  }
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of PublicKey.
 * @param {KeyringPair} pair - A polkadot-js KeyringPair.
 * @return {PublicKey} An instance of the correct subclass of PublicKey
 */
export function getPublicKeyFromKeyringPair(pair) {
  const type = getKeyPairType(pair);
  let cls;
  if (type === 'ed25519') {
    cls = PublicKeyEd25519;
  } else if (type === 'sr25519') {
    cls = PublicKeySr25519;
  } else {
    cls = PublicKeySecp256k1;
  }
  return cls.fromKeyringPair(pair);
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of Signature.
 * @param {KeyringPair} pair - A polkadot-js KeyringPair.
 * @param {array} message - an array of bytes (Uint8)
 * @returns {Signature} An instance of the correct subclass of Signature
 */
export function getSignatureFromKeyringPair(pair, message) {
  const type = getKeyPairType(pair);
  let cls;
  if (type === 'ed25519') {
    cls = SignatureEd25519;
  } else if (type === 'sr25519') {
    cls = SignatureSr25519;
  } else {
    cls = SignatureSecp256k1;
  }
  return new cls(message, pair);
}
