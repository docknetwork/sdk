import KeyringPairDidKeys from './revocation/keyring-pair-did-keys';
import OneOfPolicy from './revocation/one-of-policy';
import DidKeys from './revocation/did-keys';

// The revocation registry has id with the byte size `RevRegIdByteSize`
export const RevRegIdByteSize = 32;
// Each entry in revocation registry has byte size `RevEntryByteSize`
export const RevEntryByteSize = 32;

export {
  DidKeys,
  KeyringPairDidKeys,
  OneOfPolicy,
};
