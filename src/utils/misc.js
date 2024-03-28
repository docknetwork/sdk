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
 * Returns string containing comma-separated items of the provided iterable.
 *
 * @template V
 * @param {Iterable<V>} iter
 * @returns {string}
 */
export const fmtIter = (iter) => `\`[${[...iter].map((item) => item.toString()).join(', ')}]\``;

/**
 * Creates a promise that will call the optional supplied function `f` and return its result after `time` passes.
 * If not function provided, the promise will be resolved to `undefined`.
 *
 * @template {T}
 * @param {number} time
 * @param {function(): Promise<T>} f
 * @returns {Promise<T>}
 */
export const timeout = (time, f = () => {}) => new Promise((resolve, reject) => setTimeout(async () => {
  try {
    resolve(await f());
  } catch (err) {
    reject(err);
  }
}, time));

/**
 * Calls supplied function `fn` and waits for its completion up to `timeLimit`, retries in case timeout was fired.
 * Additionally, `delay` between retries, `maxAttempts` count, `logs` and `onError` can be specified.
 *
 * `onError` callback will be called once an error is encountered, and it can be
 * - resolved to some value, so the underlying promise will be resolved
 * - rejected, so then underlying promise will be rejected
 * - resolved to `RETRY_SYM` (second argument), so the retries will be continued
 *
 * @template T
 * @param {function(): Promise<T>} fn
 * @param {number} timeLimit
 * @param {object} [params={}]
 * @param {number} [params.delay=null]
 * @param {number} [params.maxAttempts=Infinity]
 * @param {string} [params.logsContext='']
 * @param {boolean} [params.logs=false]
 * @param {function(Error, RETRY_SYM): Promise<T | RETRY_SYM>} [params.onError=null]
 * @returns {Promise<T>}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export const retry = async (
  fn,
  timeLimit,
  {
    delay = null,
    maxAttempts = Infinity,
    onError = null,
    logs = false,
    logsContext = '',
  } = {},
) => {
  const RETRY_SYM = Symbol('retry');

  for (let i = 0; i <= maxAttempts; i++) {
    const timer = timeout(timeLimit, () => RETRY_SYM);

    let res;
    let timeoutExceeded = false;
    /* eslint-disable no-await-in-loop */
    if (onError != null) {
      try {
        res = await Promise.race([timer, fn()]);
        timeoutExceeded = res === RETRY_SYM;
      } catch (error) {
        if (logs) {
          console.error(
            `An error \`${error}\` thrown for \`${fn}\` on ${i} iteration`,
          );
        }
        res = await onError(error, RETRY_SYM);
      }
    } else {
      res = await Promise.race([timer, fn()]);
      timeoutExceeded = res === RETRY_SYM;
    }

    if (timeoutExceeded && logs) {
      console.error(
        `Timeout of ${timeLimit} ms exceeded for \`${fn}\`${
          i > 0 ? ` ${i} times` : ''
        }${logsContext && `, context: \`${logsContext}\``}`,
      );
    }

    if (res !== RETRY_SYM) {
      return res;
    } else if (delay != null) {
      await timeout(delay);
    }
    /* eslint-enable no-await-in-loop */
  }

  throw new Error(
    `Promise created by \`${fn}\` didn't resolve within the specified timeout of ${timeLimit} ms ${maxAttempts} times`,
  );
};
/* eslint-enable sonarjs/cognitive-complexity */

/**
 * Pattern matching error.
 *
 * @param message
 * @param path
 * @param pattern
 * @param errors
 */
export class PatternError extends Error {
  constructor(message, path, pattern, errors = []) {
    super(message);

    this.message = message;
    this.path = path;
    this.pattern = pattern;
    this.errors = errors;
  }
}

/**
 * Entity used to ensure that provided value matches supplied pattern(s), throws error(s) otherwise.
 */
export class PatternMatcher {
  /**
   * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
   *
   * @param pattern
   * @param value
   * @param {?Array} path
   */
  check(pattern, value, path = []) {
    for (const key of Object.keys(pattern)) {
      if (!key.startsWith('$') || this[key] == null) {
        throw new PatternError(`Invalid pattern key \`${key}\``, path, pattern);
      }

      try {
        this[key](pattern, value, path);
      } catch (error) {
        if (error instanceof PatternError) {
          throw error;
        } else {
          const message = path.length > 0
            ? `${error.message}, path: \`${path.join('.')}\``
            : error.message;

          throw new PatternError(message, path, pattern, error.errors);
        }
      }
    }
  }

  /**
   * Supplied value matches pattern's type.
   *
   * @param pattern
   * @param value
   */
  $matchType(pattern, value) {
    // eslint-disable-next-line valid-typeof
    if (typeof value !== pattern.$matchType) {
      throw new Error(
        `Invalid value provided, expected value with type \`${
          pattern.$matchType
        }\`, received value with type \`${typeof value}\``,
      );
    }
  }

  /**
   * Supplied value matches pattern's value.
   *
   * @param pattern
   * @param value
   */
  $matchValue(pattern, value) {
    if (value !== pattern.$matchValue) {
      throw new Error(
        `Unknown value \`${value}\`, expected ${pattern.$matchValue}`,
      );
    }
  }

  /**
   * Supplied value is an object that matches pattern's object patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $matchObject(pattern, value, path) {
    for (const key of Object.keys(value)) {
      if (!Object.hasOwnProperty.call(pattern.$matchObject, key)) {
        throw new Error(
          `Invalid property \`${key}\`, expected keys: ${fmtIter(
            Object.keys(pattern.$matchObject),
          )}`,
        );
      }

      this.check(pattern.$matchObject[key], value[key], path.concat(key));
    }
  }

  /**
   * Supplied value is an iterable that matches the pattern's iterable's patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $matchIterable(pattern, value, path) {
    if (typeof value[Symbol.iterator] !== 'function') {
      throw new Error(`Iterable expected, received: ${value}`);
    }
    const objectIter = value[Symbol.iterator]();

    let idx = 0;
    for (const pat of pattern.$matchIterable) {
      const { value: item, done } = objectIter.next();
      if (done) {
        throw new Error(
          `Value iterable is shorter than expected, received: ${fmtIter(value)}`,
        );
      }

      this.check(pat, item, path.concat(idx++));
    }
  }

  /**
   * Supplied value is an instance of the pattern's specified constructor.
   *
   * @param pattern
   * @param value
   */
  $instanceOf(pattern, value) {
    if (!(value instanceof pattern.$instanceOf)) {
      throw new Error(
        `Invalid value provided, expected instance of \`${pattern.$instanceOf.name}\`, received instance of \`${value?.constructor?.name}\``,
      );
    }
  }

  /**
   * Supplied value is an iterable each item of which matches `pattern`'s pattern.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $iterableOf(pattern, value, path) {
    if (typeof value?.[Symbol.iterator] !== 'function') {
      throw new Error(`Iterable expected, received \`${value}\``);
    }

    let idx = 0;
    for (const entry of value) {
      this.check(pattern.$iterableOf, entry, path.concat(idx++));
    }
  }

  /**
   * Supplied value is a map in which keys and values match `pattern`'s patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $mapOf(pattern, value, path) {
    if (typeof value?.entries !== 'function') {
      throw new Error(`Map expected, received \`${value}\``);
    }

    if (!Array.isArray(pattern.$mapOf) || pattern.$mapOf.length !== 2) {
      throw new Error(
        `\`$mapOf\` pattern should be an array with two items, received \`${JSON.stringify(
          pattern,
        )}\``,
      );
    }

    for (const [key, item] of value.entries()) {
      this.check(pattern.$mapOf[0], key, path.concat(`${key}#key`));
      this.check(pattern.$mapOf[1], item, path.concat(key));
    }
  }

  /**
   * Supplied value matches at least one of `pattern`'s patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $anyOf(pattern, value, path) {
    let anySucceeded = false;
    const errors = [];

    for (const pat of pattern.$anyOf) {
      if (anySucceeded) {
        break;
      } else {
        try {
          this.check(pat, value, path);
          anySucceeded = true;
        } catch (err) {
          errors.push(err);
        }
      }
    }

    if (!anySucceeded) {
      const error = new Error(`Neither of patterns succeeded for \`${value}\``);
      error.errors = errors;

      throw error;
    }
  }

  /**
   * Supplied value is an object with one key existing in `pattern` that matches the pattern under this key.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $objOf(pattern, value, path) {
    const keys = Object.keys(value);
    if (keys.length !== 1) {
      throw new Error('Expected a single key');
    }
    const [key] = keys;

    if (!Object.hasOwnProperty.call(pattern.$objOf, key)) {
      throw new Error(
        `Invalid value key provided, expected one of \`${fmtIter(
          Object.keys(pattern.$objOf),
        )}\`, received \`${key}\``,
      );
    }

    this.check(pattern.$objOf[key], value[key], path.concat(key));
  }

  /**
   * Ensures that supplied value satisfies provided function.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $ensure(pattern, value) {
    pattern.$ensure(value);
  }
}

/**
 * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
 *
 * @param pattern
 * @param value
 */
export const ensureMatchesPattern = (pattern, value) => new PatternMatcher().check(pattern, value);
