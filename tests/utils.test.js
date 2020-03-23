import {cryptoWaitReady, randomAsHex} from '@polkadot/util-crypto';
import {Keyring} from '@polkadot/api';

import {
  getCorrectPublicKeyFromKeyringPair,
  getCorrectSignatureFromKeyringPair,
  isHexWithGivenByteSize
} from '../src/utils/misc';
import {PublicKeyEd25519, PublicKeySr25519} from '../src/public-key';
import {SignatureEd25519, SignatureSr25519} from '../src/signature';

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

  test('getCorrectPublicKeyFromKeyringPair throws error on unknown public key type', () => {
    // Create a keypair of type 'ee25519' which is not supported as of now. Moreover this seems like a bug in
    // polkadot-js as it should not allow to create such pair
    let keyring = new Keyring();
    let badPair = keyring.addFromUri(randomAsHex(32), null, 'ee25519');
    expect(() => getCorrectPublicKeyFromKeyringPair(badPair)).toThrow('Only ed25519 and sr25519 keys supported as of now');
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from ed25519 pair', () => {
    let keyring = new Keyring();
    let pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const pk = getCorrectPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeyEd25519).toBe(true);
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from sr25519 pair', () => {
    let keyring = new Keyring();
    let pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const pk = getCorrectPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySr25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair throws error on unknown public key type', () => {
    // Create a keypair of type 'ee25519' which is not supported as of now. Moreover this seems like a bug in
    // polkadot-js as it should not allow to create such pair
    let keyring = new Keyring();
    let badPair = keyring.addFromUri(randomAsHex(32), null, 'ee25519');
    expect(() => getCorrectSignatureFromKeyringPair(badPair, [1, 2])).toThrow('Only ed25519 and sr25519 keys supported as of now');
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from ed25519 pair', () => {
    let keyring = new Keyring();
    let pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const sig = getCorrectSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureEd25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from sr25519 pair', () => {
    let keyring = new Keyring();
    let pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const sig = getCorrectSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSr25519).toBe(true);
  });
});
