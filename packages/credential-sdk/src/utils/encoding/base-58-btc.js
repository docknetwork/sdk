import { base58btc } from 'multiformats/bases/base58';
import varint from 'varint';
import { ensureString } from '../types/string';
import { normalizeToU8a } from '../types/bytes';
import { catchFnErrorWith } from '../error';

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
export const decodeFromBase58btc = catchFnErrorWith(
  'Invalid base58btc string',
  (string) => {
    // Decode base58btc multibase string
    const decoded = base58btc.decode(ensureString(string));
    varint.decode(decoded); // Decode to get byte length
    return decoded.slice(varint.decode.bytes);
  },
);
