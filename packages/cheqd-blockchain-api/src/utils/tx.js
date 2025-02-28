import { u8aToHex } from '@docknetwork/credential-sdk/utils';
import { sha256 } from 'js-sha256';

/**
 * Calculates a hash for the signed transaction.
 *
 * @param {object} signedTx
 * @returns {string}
 */
export const signedTxHash = (bytes) => u8aToHex(sha256.digest(bytes)).slice(2).toUpperCase();
