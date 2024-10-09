export const DockDIDMethod = 'dock';
export const CheqdDIDMethod = 'cheqd';
export const Secp256k1PublicKeyPrefix = 'zQ3s';
export const Ed25519PublicKeyPrefix = 'z6Mk';

export const DockDIDQualifier = `did:${DockDIDMethod}:`;
export const DockDIDByteSize = 32;

export const CheqdDIDQualifier = `did:${CheqdDIDMethod}:`;
export const CheqdDIDTestnetQualifier = `${CheqdDIDQualifier}testnet:`;
export const CheqdDIDMainnetQualifier = `${CheqdDIDQualifier}mainnet:`;
export const CheqdDIDByteSize = 16;

export const DidMethodKeyQualifier = 'did:key:';
export const DidMethodKeySecp256k1ByteSize = 33;
export const DidMethodKeyEd25519ByteSize = 32;

export const DidMethodKeySecp256k1Prefix = `${DidMethodKeyQualifier}${Secp256k1PublicKeyPrefix}`;
export const DidMethodKeyEd25519Prefix = `${DidMethodKeyQualifier}${Ed25519PublicKeyPrefix}`;

export const DidMethodKeyBytePrefixEd25519 = new Uint8Array([0xed, 0x01]);
export const DidMethodKeyBytePrefixSecp256k1 = new Uint8Array([0xe7, 0x01]);
