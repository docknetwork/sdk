import {ec as EC} from 'elliptic';

import {PublicKeyEd25519, PublicKeySr25519} from '../public-key';
import {SignatureEd25519, SignatureSr25519} from '../signature';

const secp256k1Curve = new EC('secp256k1');

/**
 * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
 * @param {string} value - Hexadecimal value
 * @param {number} byteSize - Expected byte size of the input.
 * @return {Boolean} True if hex (with given size) else false
 */
function isHexWithGivenByteSize(value, byteSize) {
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
function getBytesForStateChange(api, stateChange) {
  return api.createType('StateChange', stateChange).toU8a();
}

function generateEcdsaSecp256k1Keypair(seed) {
  return secp256k1Curve.genKeyPair({entropy: seed});
}

function verifyEcdsaSecp256k1Sig(message, signature, publicKey) {
  const pk = publicKey.value.slice(2);
  const sig = { r: signature.value.slice(0, 64), s: signature.value.slice(64, 128) };
  const recoveryParam = parseInt(signature.value.slice(128, 130), 16);
  return secp256k1Curve.verify(message, sig, recoveryParam, secp256k1Curve.keyFromPublic(pk, 'hex'));
}

function getKeyPairType(pair) {
  if (pair.type && (pair.type === 'ed25519' || pair.type === 'sr25519')) {
    return pair.type;
  } else if (pair.ec && pair.priv && pair.pub) {
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
function getPublicKeyFromKeyringPair(pair) {
  if (pair.type !== 'ed25519' && pair.type !== 'sr25519') {
    throw new Error('Only ed25519 and sr25519 keys supported as of now');
  }
  return pair.type === 'ed25519' ? PublicKeyEd25519.fromKeyringPair(pair) : PublicKeySr25519.fromKeyringPair(pair);
}

/**
 * Inspect the `type` of the `KeyringPair` to generate the correct kind of Signature.
 * @param {KeyringPair} pair - A polkadot-js KeyringPair.
 * @param {array} message - an array of bytes (Uint8)
 * @returns {Signature} An instance of the correct subclass of Signature
 */
function getSignatureFromKeyringPair(pair, message) {
  if (pair.type !== 'ed25519' && pair.type !== 'sr25519') {
    throw new Error('Only ed25519 and sr25519 keys supported as of now');
  }
  return pair.type === 'ed25519' ? new SignatureEd25519(message, pair) : new SignatureSr25519(message, pair);
}

export {
  isHexWithGivenByteSize,
  getBytesForStateChange,
  generateEcdsaSecp256k1Keypair,
  verifyEcdsaSecp256k1Sig,
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair
};
