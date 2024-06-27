import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';

import {
  validateDockDIDHexIdentifier,
  validateDockDIDSS58Identifier,
  DockDIDQualifier,
  DockDIDByteSize,
  DidMethodKeyQualifier,
  DockDidOrDidMethodKey,
  DockDid,
  DidMethodKey,
} from '../../src/did';
import { getHexIdentifier } from '../../src/utils/codec';

const hexDid = (did) => getHexIdentifier(
  did,
  [DockDIDQualifier, DidMethodKeyQualifier],
  DockDIDByteSize,
);

describe('`DockDidOrDidMethodKey.from`', () => {
  test('`DockDid.from` work for a raw did', () => {
    const result = DockDid.from(
      '5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk',
    );
    expect(result.did).toEqual(
      '0x338afad72761cffcd0619b8e00fe64a32f79463143e0e812a76b1030c593bb4e',
    );

    expect(() => DockDidOrDidMethodKey.from(
      '5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk',
    )).toThrowErrorMatchingSnapshot();
  });

  test('`DidMethodKey.from` work for a raw did:key', () => {
    const result = DidMethodKey.from(
      'zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
    );
    expect(result.didMethodKey.secp256k1).toEqual(
      '0x03874c15c7fda20e539c6e5ba573c139884c351188799f5458b4b41f7924f235cd',
    );
    expect(result.toString()).toEqual(
      'did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
    );

    expect(() => DockDidOrDidMethodKey.from(
      'zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
    )).toThrowErrorMatchingSnapshot();
  });

  test('`DockDidOrDidMethodKey.from`/`DockDid.from` work for did:dock', () => {
    const classes = [DockDidOrDidMethodKey, DockDid];

    for (const Did of classes) {
      const result = Did.from(
        'did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk',
      );
      expect(result.did).toEqual(
        '0x338afad72761cffcd0619b8e00fe64a32f79463143e0e812a76b1030c593bb4e',
      );
    }
  });

  test('`DockDidOrDidMethodKey.from`/`DidMethodKey.from` works for did:key secp256k1', () => {
    const classes = [DockDidOrDidMethodKey, DidMethodKey];

    for (const Did of classes) {
      const result = Did.from(
        'did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
      );
      expect(result.didMethodKey.secp256k1).toEqual(
        '0x03874c15c7fda20e539c6e5ba573c139884c351188799f5458b4b41f7924f235cd',
      );
      expect(result.toString()).toEqual(
        'did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
      );
    }
  });

  test('`DockDidOrDidMethodKey.from`/`DidMethodKey.from` works for did:key ed25519', () => {
    const classes = [DockDidOrDidMethodKey, DidMethodKey];

    for (const Did of classes) {
      const result = Did.from(
        'did:key:z6MktvqCyLxTsXUH1tUZncNdVeEZ7hNh7npPRbUU27GTrYb8',
      );
      expect(result.didMethodKey.ed25519).toEqual(
        '0xd713cb7f8624d8648496e01010f2bd72f0dcbbdecdb7036f38c20475f5f429bf',
      );
      expect(result.toString()).toEqual(
        'did:key:z6MktvqCyLxTsXUH1tUZncNdVeEZ7hNh7npPRbUU27GTrYb8',
      );
    }
  });
});

describe('DID utilities', () => {
  test('On input as 40 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(40))).toThrow(
      /DID identifier must be 32 bytes/,
    );
  });

  test('On input as 30 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(30))).toThrow(
      /DID identifier must be 32 bytes/,
    );
  });

  test('On input as 32 byte hex, validateDockDIDIdentifier does not throw error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(32))).not.toThrow();
  });

  test('On input as 33 byte hex, hexDid throws error', () => {
    const hex = randomAsHex(33);
    expect(() => hexDid(hex)).toThrow(/Invalid hex/);
  });

  test('On input as 32 byte hex, hexDid returns the input', () => {
    const hex = randomAsHex(32);
    expect(hexDid(hex)).toBe(hex);
  });

  test('On input valid SS58 but without qualifier, hexDid throws error', () => {
    const hex = randomAsHex(32);
    const id = encodeAddress(hex);
    // Without the qualifier, the function tries to parse as hex
    expect(() => hexDid(id)).toThrow(/Invalid hex/);
  });

  test('On input invalid SS58 but with qualifier, hexDid throws error', () => {
    const did = `${DockDIDQualifier}oO12`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => hexDid(did)).toThrow(/Invalid SS58/);
  });

  test('On input fully qualified Dock DID, hexDid returns valid hex representation', () => {
    // create a valid DID
    const hex = randomAsHex(32);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    expect(hexDid(did)).toBe(hex);
  });

  test('On input valid SS58 and with qualifier but smaller than 32 bytes, hexDid throws error', () => {
    const hex = randomAsHex(8);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => hexDid(did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 and with qualifier but larger than 32 bytes, hexDid throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${DockDIDQualifier}${ss58}${ss58}`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => hexDid(did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 identifier but smaller than 32 bytes, validateDockDIDSS58Identifier throws error', () => {
    const ss58 = encodeAddress(randomAsHex(8));
    expect(() => validateDockDIDSS58Identifier(ss58)).toThrow(
      /The identifier must be 32 bytes and valid SS58 string/,
    );
  });

  test('On input valid SS58 identifier but larger than 32 bytes, validateDockDIDSS58Identifier throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${ss58}${ss58}`;
    expect(() => validateDockDIDSS58Identifier(did)).toThrow(
      /The identifier must be 32 bytes and valid SS58 string/,
    );
  });

  test('On input valid SS58 identifier, validateDockDIDSS58Identifier does not throw error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    expect(() => validateDockDIDSS58Identifier(ss58)).not.toThrow();
  });
});
