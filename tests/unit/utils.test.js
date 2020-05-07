import { cryptoWaitReady, randomAsHex } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';

import {
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair,
} from '../../src/utils/misc';
import { PublicKeyEd25519, PublicKeySr25519, PublicKeySecp256k1 } from '../../src/public-keys';
import { SignatureEd25519, SignatureSr25519, SignatureSecp256k1 } from '../../src/signatures';
import { isHexWithGivenByteSize } from '../../src/utils/codec';

describe('Testing isHexWithGivenByteSize', () => {
  test('isHexWithGivenByteSize rejects strings not starting with 0x', () => {
    expect(isHexWithGivenByteSize('12')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with invalid hex', () => {
    expect(isHexWithGivenByteSize('0x1h')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with non-full byte', () => {
    expect(isHexWithGivenByteSize('0x123')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with byte size 0', () => {
    expect(isHexWithGivenByteSize('0x')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings not matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 2)).toBe(false);
    expect(isHexWithGivenByteSize('0x1234', 1)).toBe(false);
    expect(isHexWithGivenByteSize('0x1234', 0)).toBe(false);
  });

  test('isHexWithGivenByteSize accepts correct hex string with full bytes', () => {
    expect(isHexWithGivenByteSize('0x12')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef')).toBe(true);
  });

  test('isHexWithGivenByteSize accepts correct hex string matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 1)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234', 2)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef', 3)).toBe(true);
  });
});

describe('Testing public key and signature instantiation from keyring', () => {
  beforeAll(async (done) => {
    await cryptoWaitReady();
    done();
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from ed25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeyEd25519).toBe(true);
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from sr25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySr25519).toBe(true);
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from secp256k1 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ecdsa');
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySecp256k1).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from ed25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureEd25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from sr25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSr25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from secp256k1 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ecdsa');
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSecp256k1).toBe(true);
  });
});
