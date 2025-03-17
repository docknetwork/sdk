import { ensureString } from '../types/string';
import { normalizeToU8a, u8aToU8a } from '../types/bytes';
import { catchFnErrorWith } from '../error';

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
export const decodeFromBase64 = catchFnErrorWith(
  'Invalid base64 string',
  (string) => u8aToU8a(Buffer.from(ensureString(string), 'base64')),
);
