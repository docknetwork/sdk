import bs58 from 'bs58';
import { ensureString } from '../types/ensure-type';
import { normalizeToU8a } from '../bytes';

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
export const decodeFromBase58 = (string) => {
  try {
    return bs58.decode(ensureString(string));
  } catch (err) {
    err.message = `Failed to decode base58 string \`${string}\`:\n${err.message}`;

    throw err;
  }
};
