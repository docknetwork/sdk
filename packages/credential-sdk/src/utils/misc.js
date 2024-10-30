/* eslint-disable max-classes-per-file */
import elliptic from 'elliptic';

import { sha256 } from 'js-sha256';
import { PatternMatcher } from './generic';
import { METHOD_REG_EXP_PATTERN } from '../resolver/generic/const';

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

// deep copy a json serializable object
export function deepClone(obj) {
  // https://jsben.ch/E55IQ
  return JSON.parse(JSON.stringify(obj));
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

const ID_CHAR = '[a-zA-Z0-9_.-]';
const METHOD_ID = `(${ID_CHAR}+(:${ID_CHAR}+)*)`;
const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';
const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;
const PARAMS = `((${PARAM})*)`;
// eslint-disable-next-line no-useless-escape
const PATH = '(/[^#?]*)?';
const QUERY = '([?][^#]*)?';
// eslint-disable-next-line no-useless-escape
const FRAGMENT = '(#.*)?';
const DID_MATCHER = new RegExp(
  `^did:${METHOD_REG_EXP_PATTERN}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`,
);

/**
 * Parses supplied DID URL.
 * @param {string} didUrl
 * @returns
 */
export function parseDIDUrl(didUrl) {
  if (didUrl === '' || !didUrl) throw new Error('Missing DID');
  const sections = didUrl.match(DID_MATCHER);
  if (sections) {
    const parts = {
      did: `did:${sections[1]}:${sections[2]}`,
      method: sections[1],
      id: sections[2],
      didUrl,
    };
    if (sections[4]) {
      const params = sections[4].slice(1).split(';');
      parts.params = {};
      for (const p of params) {
        const kv = p.split('=');

        // eslint-disable-next-line prefer-destructuring
        parts.params[kv[0]] = kv[1];
      }
    }
    // eslint-disable-next-line prefer-destructuring
    if (sections[6]) parts.path = sections[6];
    if (sections[7]) parts.query = sections[7].slice(1);
    if (sections[8]) parts.fragment = sections[8].slice(1);
    return parts;
  }
  throw new Error(`Invalid DID: \`${didUrl}\``);
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
