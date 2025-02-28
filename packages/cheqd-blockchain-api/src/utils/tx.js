import { u8aToHex, normalizeToU8a } from '@docknetwork/credential-sdk/utils';
import { sha256 } from 'js-sha256';

/**
 * Calculates a hash for the signed transaction.
 *
 * @param {Uint8Array} signedTx
 * @returns {string}
 */
export const signedTxHash = (bytes) => u8aToHex(sha256.digest(normalizeToU8a(bytes)))
  .slice(2)
  .toUpperCase();
