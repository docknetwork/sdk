import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';

import {
  validateDockDIDHexIdentifier,
  validateDockDIDSS58Identifier,
  DockDIDQualifier, DockDIDByteSize, DockDIDMethodKeyQualifier,
} from '../../src/utils/did';
import { getHexIdentifier } from '../../src/utils/codec';

const hexDid = (did) => getHexIdentifier(
  did,
  [DockDIDQualifier, DockDIDMethodKeyQualifier],
  DockDIDByteSize,
);

describe('DID utilities', () => {
  test('On input as 40 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(40))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 30 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(30))).toThrow(/DID identifier must be 32 bytes/);
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
    expect(() => validateDockDIDSS58Identifier(ss58)).toThrow(/The identifier must be 32 bytes and valid SS58 string/);
  });

  test('On input valid SS58 identifier but larger than 32 bytes, validateDockDIDSS58Identifier throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${ss58}${ss58}`;
    expect(() => validateDockDIDSS58Identifier(did)).toThrow(/The identifier must be 32 bytes and valid SS58 string/);
  });

  test('On input valid SS58 identifier, validateDockDIDSS58Identifier does not throw error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    expect(() => validateDockDIDSS58Identifier(ss58)).not.toThrow();
  });
});
