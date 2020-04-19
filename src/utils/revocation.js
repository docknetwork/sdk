import { randomAsHex } from '@polkadot/util-crypto';

import KeyringPairDidKeys from './revocation/keyring-pair-did-keys';
import OneOfPolicy from './revocation/one-of-policy';
import DidKeys from './revocation/did-keys';

// The revocation registry has id with the byte size `RevRegIdByteSize`
export const RevRegIdByteSize = 32;
// Each entry in revocation registry has byte size `RevEntryByteSize`
export const RevEntryByteSize = 32;

/**
 * Generate a random revocation registry id.
 * @returns {string} The id as a hex string
 */
export function createRandomRegistryId() {
  return randomAsHex(RevRegIdByteSize);
}

export {
  DidKeys,
  KeyringPairDidKeys,
  OneOfPolicy,
};
