import {Keyring} from '@polkadot/api';
import {randomAsHex, encodeAddress} from '@polkadot/util-crypto';

import {
  validateDockDIDHexIdentifier,
  validateDockDIDSS58Identifier,
  getHexIdentifierFromDID,
  DockDIDQualifier,
  createNewDockDID,
  createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval
} from '../../src/utils/did';
import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {generateEcdsaSecp256k1Keypair, getPublicKeyFromKeyringPair} from '../../src/utils/misc';
import {PublicKeyEd25519} from '../../src/public-key';

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

  test('On input as 33 byte hex, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(33);
    expect(() => getHexIdentifierFromDID(hex)).toThrow(/Invalid hex/);
  });

  test('On input as 32 byte hex, getHexIdentifierFromDID returns the input', () => {
    const hex = randomAsHex(32);
    expect(getHexIdentifierFromDID(hex)).toBe(hex);
  });

  test('On input valid SS58 but without qualifier, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(32);
    const id = encodeAddress(hex);
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(id)).toThrow(/Invalid hex/);
  });

  test('On input invalid SS58 but with qualifier, getHexIdentifierFromDID throws error', () => {
    const did = `${DockDIDQualifier}oO12`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
  });

  test('On input fully qualified Dock DID, getHexIdentifierFromDID returns valid hex representation', () => {
    // create a valid DID
    const hex = randomAsHex(32);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    expect(getHexIdentifierFromDID(did)).toBe(hex);
  });

  test('On input valid SS58 and with qualifier but smaller than 32 bytes, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(8);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 and with qualifier but larger than 32 bytes, getHexIdentifierFromDID throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${DockDIDQualifier}${ss58}${ss58}`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
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
