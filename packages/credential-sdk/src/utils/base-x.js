import bs58 from 'bs58';
import { base58btc } from 'multiformats/bases/base58';
import varint from 'varint';
import { ensureString } from './type-helpers';
import { normalizeToU8a, u8aToU8a } from './bytes';

/**
 * Encodes supplied bytes as base58 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const encodeAsBase58 = (bytes) => bs58.encode(normalizeToU8a(bytes));
/**
 * Decodes bytes of the supplied base58 string.
 * @param {string} string
 * @returns {Uint8Array}
 */
export const decodeFromBase58 = (string) => bs58.decode(ensureString(string));

/**
 * Encodes supplied bytes as base58btc string using given prefix.
 * @param {Uint8Array} value
 * @param {Uint8Array} prefix
 * @returns {string}
 */
export const encodeAsBase58btc = (prefix, value) => {
  const prefixBytes = normalizeToU8a(prefix);
  const bytes = normalizeToU8a(value);

  // Use the supplied prefix
  const multibase = new Uint8Array(prefixBytes.length + bytes.length);

  // Add multibase prefix and concatenate with bytes
  multibase.set(prefixBytes);
  multibase.set(bytes, prefixBytes.length);

  // Return the encoded base58btc multibase string
  return base58btc.encode(multibase);
};

/**
 * Decodes bytes of the supplied base58btc string.
 * @param {string} string
 * @returns {Uint8Array}
 */
export const decodeFromBase58btc = (string) => {
  // Decode base58btc multibase string
  const decoded = base58btc.decode(ensureString(string));
  varint.decode(decoded); // Decode to get byte length
  return decoded.slice(varint.decode.bytes);
};

/**
 * Encodes supplied bytes as base64 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const encodeAsBase64 = (bytes) => Buffer.from(normalizeToU8a(bytes)).toString('base64');
/**
 * Decodes bytes of the supplied base64 string.
 * @param {string} string
 * @returns {Uint8Array}
 */
export const decodeFromBase64 = (string) => u8aToU8a(Buffer.from(ensureString(string), 'base64'));
