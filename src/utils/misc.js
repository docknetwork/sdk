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
 * Returns string containing comma separated items of the provided iterable.
 *
 * @template V
 * @param {Iterable<V>} iter
 * @returns {string}
 */
export const fmtIter = (iter) => `\`[${[...iter].map((item) => item.toString()).join(', ')}]\``;

const PatternAttrs = new Set([
  '$matchType',
  '$matchValue',
  '$matchObject',
  '$matchIterable',
  '$instanceOf',
  '$iterableOf',
  '$mapOf',
  '$anyOf',
  '$objOf',
]);

/**
 * Ensures that provided value matches supplied pattern, throws an error otherwise.
 *
 * @param pattern
 * @param value
 * @param path
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const ensureMatchesStructurePattern = (pattern, value, path = []) => {
  const patternAttrs = new Set(Object.keys(pattern));

  for (const key of patternAttrs) {
    if (!PatternAttrs.has(key)) {
      throw new Error(
        `Invalid pattern modifier: ${key}, path: \`${path.join('.')}\`.`,
      );
    }
  }

  // eslint-disable-next-line valid-typeof
  if (patternAttrs.has('$matchType') && typeof value !== pattern.$matchType) {
    throw new Error(
      `Invalid value provided, expected value with type \`${
        pattern.$matchType
      }\`, received value with type \`${typeof value}\`, path: \`${path.join(
        '.',
      )}\`.`,
    );
  }

  if (patternAttrs.has('$matchValue') && value !== pattern.$matchValue) {
    throw new Error(
      `Unknown value \`${value}\`, expected ${
        pattern.$matchValue
      }, path: \`${path.join('.')}\`.`,
    );
  }

  if (patternAttrs.has('$matchObject')) {
    for (const key of Object.keys(value)) {
      if (!Object.hasOwnProperty.call(pattern.$matchObject, key)) {
        throw new Error(
          `Invalid property \`${key}\`, expected keys: \`${fmtIter(
            Object.keys(pattern.$matchObject),
          )}\`, path: \`${path.join('.')}\`, pattern: \`${JSON.stringify(
            pattern,
          )}\``,
        );
      }

      ensureMatchesStructurePattern(
        pattern.$matchObject[key],
        value[key],
        path.concat(key),
      );
    }
  }

  if (patternAttrs.has('$matchIterable')) {
    if (typeof value[Symbol.iterator] !== 'function') {
      throw new Error(
        `Iterable expected, received: ${value}, path: \`${path.join('.')}\`.`,
      );
    }
    const objectIter = value[Symbol.iterator]();

    let idx = 0;
    for (const pat of pattern.$matchIterable) {
      const { value: item, done } = objectIter.next();
      if (done) {
        throw new Error(
          `Value iterable is shorter than expected, received: ${fmtIter(
            value,
          )}, path: \`${path.join('.')}\`.`,
        );
      }

      ensureMatchesStructurePattern(pat, item, path.concat(`@item#${idx++}`));
    }
  }

  if (
    patternAttrs.has('$instanceOf')
    && !(value instanceof pattern.$instanceOf)
  ) {
    throw new Error(
      `Invalid value provided, expected instance of \`${
        pattern.$instanceOf.name
      }\`, received instance of \`${
        value?.constructor?.name
      }\`, path: \`${path.join('.')}\`.`,
    );
  }

  if (patternAttrs.has('$iterableOf')) {
    if (typeof value?.[Symbol.iterator] !== 'function') {
      throw new Error(
        `Iterable expected, received \`${value}\`, path: \`${path.join('.')}\`.`,
      );
    }

    let idx = 0;
    for (const entry of value) {
      ensureMatchesStructurePattern(
        pattern.$iterableOf,
        entry,
        path.concat(`@item#${idx++}`),
      );
    }
  }

  if (patternAttrs.has('$mapOf')) {
    if (typeof value?.entries !== 'function') {
      throw new Error(
        `Map expected, received \`${value}\`, path: \`${path.join('.')}\`.`,
      );
    }

    if (!Array.isArray(pattern.$mapOf) || pattern.$mapOf.length !== 2) {
      throw new Error(
        `\`$mapOf\` pattern should be an array with two items, received \`${JSON.stringify(
          pattern,
        )}\`, path: \`${path.join('.')}\``,
      );
    }

    for (const [key, item] of value.entries()) {
      ensureMatchesStructurePattern(
        pattern.$mapOf[0],
        key,
        path.concat(`${key}#key`),
      );
      ensureMatchesStructurePattern(pattern.$mapOf[1], item, path.concat(key));
    }
  }

  if (patternAttrs.has('$anyOf')) {
    let anySucceeded = false;
    const errors = [];
    for (const patEntry of pattern.$anyOf) {
      try {
        ensureMatchesStructurePattern(patEntry, value, path);
        anySucceeded = true;
      } catch (err) {
        errors.push(err);
      }
    }

    if (!anySucceeded) {
      throw new Error(
        `Neither of pattern succeeded for \`${value}\`: ${JSON.stringify(
          errors.map((err) => err.message),
        )}, path: \`${path.join('.')}\`.`,
      );
    }
  }

  if (patternAttrs.has('$objOf')) {
    const keys = Object.keys(value);
    if (keys.length !== 1) {
      throw new Error('Expected a single key');
    }
    if (!Object.hasOwnProperty.call(pattern.$objOf, keys[0])) {
      throw new Error(
        `Invalid value key provided, expected one of \`${fmtIter(
          Object.keys(pattern.$objOf),
        )}\`, received \`${keys[0]}\`, path: \`${path.join('.')}\`.`,
      );
    }
    ensureMatchesStructurePattern(
      pattern.$objOf[keys[0]],
      value[keys[0]],
      path.concat(keys[0]),
    );
  }
};
