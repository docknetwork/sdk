import {cryptoWaitReady, randomAsHex} from '@polkadot/util-crypto';
import {Keyring} from '@polkadot/api';

import {
  generateEcdsaSecp256k1Keypair,
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair,
  isHexWithGivenByteSize, verifyEcdsaSecp256k1Sig
} from '../../src/utils/misc';
import {PublicKeyEd25519, PublicKeySr25519, PublicKeySecp256k1} from '../../src/public-key';
import {SignatureEd25519, SignatureSr25519, SignatureSecp256k1} from '../../src/signature';

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
    const keyring = new Keyring();
    const badPair = keyring.addFromUri(randomAsHex(32), null, 'ee25519');
    expect(() => getPublicKeyFromKeyringPair(badPair)).toThrow('Only ed25519, sr25519 and secp256k1 keys supported as of now');
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
    const pair = generateEcdsaSecp256k1Keypair();
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySecp256k1).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair throws error on unknown public key type', () => {
    // Create a keypair of type 'ee25519' which is not supported as of now. Moreover this seems like a bug in
    // polkadot-js as it should not allow to create such pair
    const keyring = new Keyring();
    const badPair = keyring.addFromUri(randomAsHex(32), null, 'ee25519');
    expect(() => getSignatureFromKeyringPair(badPair, [1, 2])).toThrow('Only ed25519, sr25519 and secp256k1 keys supported as of now');
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
    const pair = generateEcdsaSecp256k1Keypair('my pers string', randomAsHex(32));
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSecp256k1).toBe(true);
  });
});

describe('Testing Ecdsa with secp256k1', () => {
  test('Signing and verification works', () => {
    const msg = [1, 2, 3, 4];
    const pair = generateEcdsaSecp256k1Keypair();
    const pk = PublicKeySecp256k1.fromKeyringPair(pair);
    const sig = new SignatureSecp256k1(msg, pair);
    expect(verifyEcdsaSecp256k1Sig(msg, sig, pk)).toBe(true);
  });
});
