import bs58 from 'bs58';
import { base58btc } from 'multiformats/bases/base58';
import varint from 'varint';
import { ensureString } from './type-helpers';
import { normalizeToU8a, stringToU8a } from './bytes';

/**
 * Encodes supplied bytes as base58 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const encodeAsBase58 = (bytes) => bs58.encode(normalizeToU8a(bytes));
/**
 * Decodes bytes of the supplied base58 string.
 * @returns {Uint8Array}
 */
export const decodeFromBase58 = (string) => bs58.decode(ensureString(string));

/**
 * Encodes supplied bytes as multibase string using given prefix.
 * @param {Uint8Array} value
 * @param {Uint8Array} prefix
 * @returns {string}
 */
export const encodeAsMultibase = (value, prefix) => {
  const bytes = normalizeToU8a(value);
  const prefixBytes = normalizeToU8a(prefix);

  // Use the static prefix (MULTICODEC_ED25519_HEADER)
  const multibase = new Uint8Array(prefixBytes.length + bytes.length);

  // Add multibase prefix and concatenate with bytes
  multibase.set(prefixBytes);
  multibase.set(bytes, prefixBytes.length);

  // Return the encoded base58btc multibase string
  return base58btc.encode(multibase);
};

/**
 * Decodes bytes of the supplied multibase string.
 * @param {string} string
 * @returns {Uint8Array}
 */
export const decodeFromMultibase = (string) => {
  if (!ensureString(string).startsWith('z')) {
    throw new Error(`Invalid multibase string format: ${string}`);
  }

  // Decode base58btc multibase string
  const decoded = base58btc.decode(string);
  varint.decode(decoded); // Decode to get byte length
  return decoded.slice(varint.decode.bytes);
};

/**
 * Encodes supplied bytes as base64 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const encodeAsBase64 = (bytes) => btoa(normalizeToU8a(bytes));
/**
 * Decodes bytes of the supplied base64 string.
 * @returns {Uint8Array}
 */
export const decodeFromBase64 = (string) => stringToU8a(atob(ensureString(string)));
