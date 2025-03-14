import bs58 from 'bs58';
import { ensureString } from '../types/string';
import { normalizeToU8a } from '../types/bytes';
import { catchFnErrorWith } from '../error';

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
export const decodeFromBase58 = catchFnErrorWith(
  'Invalid base58btc string',
  (string) => bs58.decode(ensureString(string)),
);
