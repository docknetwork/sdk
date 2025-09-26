import { base58btc } from 'multiformats/bases/base58';
import { ensureString } from '../types/string';
import { normalizeToU8a } from '../types/bytes';
import { catchFnErrorWith } from '../error';

/**
 * Encodes supplied bytes as multibase base58btc string using given prefix.
 * @param {Uint8Array} value
 * @param {Uint8Array} prefix
 * @returns {string}
 */
export const encodeAsMultibase = (prefix, value) => {
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
 * Decodes bytes of the supplied multibase base58btc string.
 * @param {string} string
 * @returns {Uint8Array}
 */
export const decodeFromMultibase = catchFnErrorWith(
  'Invalid base58btc string',
  (string) => base58btc.decode(ensureString(string)),
);
