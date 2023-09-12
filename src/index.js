import DockAPI from './dock-api';

export { default as AnchorModule } from './modules/anchor';
export { default as BlobModule } from './modules/blob';
export { DIDModule } from './modules/did';
export { default as RevocationModule } from './modules/revocation';
export { default as StatusListCredentialModule } from './modules/status-list-credential';
export { default as BBSModule } from './modules/bbs';
export { default as BBSPlusModule } from './modules/bbs-plus';
export { default as LegacyBBSPlusModule } from './modules/legacy-bbs-plus';
export { default as PSModule } from './modules/ps';

export {
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1,
} from './public-keys';

export { Signature, SignatureSr25519, SignatureEd25519 } from './signatures';
export { default as OffchainSignatures } from './modules/offchain-signatures';
export { default as StatusList2021Credential } from './status-list-credential/status-list2021-credential';

export { DockAPI };
export default new DockAPI();
