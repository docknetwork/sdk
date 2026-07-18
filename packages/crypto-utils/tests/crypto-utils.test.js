import base64url from 'base64url';

import {
  Ed25519Keypair,
  Signature,
  SignatureEd25519,
  SignatureEd25519Value,
  Secp256k1Keypair,
  Secp256r1Keypair,
  createJws,
  createJwsSigner,
  createRawSigner,
  joseSignatureToDER,
  signJWS,
} from '../src';
import CredentialEd25519Keypair from '../../credential-sdk/src/keypairs/keypair-ed25519';
import CredentialSecp256k1Keypair from '../../credential-sdk/src/keypairs/keypair-secp256k1';
import CredentialSecp256r1Keypair from '../../credential-sdk/src/keypairs/keypair-secp256r1';
import {
  Signature as CredentialSignature,
  SignatureEd25519 as CredentialSignatureEd25519,
} from '../../credential-sdk/src/types/signatures/signature';
import CredentialSignatureEd25519Value from '../../credential-sdk/src/types/signatures/signature-ed25519-value';
import * as cryptoBytes from '../src/utils/types/bytes';
import * as credentialBytes from '../../credential-sdk/src/utils/types/bytes';
import DeepSignatureEd25519Value from '../src/types/signatures/signature-ed25519-value';

const message = Uint8Array.from([0, 1, 2, 3, 127, 128, 254, 255]);

describe.each([
  {
    name: 'Ed25519Keypair',
    Keypair: Ed25519Keypair,
    sourceType: 'seed',
    signatureLength: 64,
  },
  {
    name: 'Secp256k1Keypair',
    Keypair: Secp256k1Keypair,
    sourceType: 'entropy',
    signatureLength: 65,
  },
  {
    name: 'Secp256r1Keypair',
    Keypair: Secp256r1Keypair,
    sourceType: 'entropy',
    signatureLength: 65,
  },
])('$name', ({ Keypair, sourceType, signatureLength }) => {
  const source = Uint8Array.from(
    { length: Keypair.SeedSize },
    (_, index) => index + 1,
  );

  const createKeypair = () => (
    sourceType === 'seed'
      ? Keypair.fromSeed(source)
      : Keypair.fromEntropy(source)
  );

  test('signs and verifies arbitrary bytes', () => {
    const keypair = createKeypair();
    const signature = keypair.sign(message);

    expect(signature.bytes).toHaveLength(signatureLength);
    expect(Keypair.verify(message, signature, keypair.publicKey())).toBe(true);
    expect(Keypair.verify(Uint8Array.of(9), signature, keypair.publicKey())).toBe(false);
    if (signatureLength === 65) {
      expect(Keypair.verify(
        message,
        joseSignatureToDER(signature.bytes.slice(0, 64)),
        keypair.publicKey(),
      )).toBe(true);
    }
  });

  test('round-trips private keys', () => {
    const keypair = createKeypair();
    const restored = Keypair.fromPrivateKey(keypair.privateKey());
    expect(restored.publicKey().bytes).toEqual(keypair.publicKey().bytes);
  });

  test('adapts signatures to raw Dock bytes', async () => {
    const signature = await createRawSigner(createKeypair()).sign({ data: message });
    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature).toHaveLength(signatureLength);
  });
});

describe('JWS helpers', () => {
  const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
    { length: Ed25519Keypair.SeedSize },
    (_, index) => index,
  ));
  const signer = createRawSigner(keypair);

  test('creates non-detached compact JWS', async () => {
    const jws = await signJWS(signer, 'EdDSA', { detached: false, header: {} }, message);
    const [header, payload, signature] = jws.split('.');

    expect(JSON.parse(base64url.decode(header))).toEqual({ alg: 'EdDSA' });
    expect(payload).not.toBe('');
    expect(base64url.toBuffer(signature)).toHaveLength(64);
  });

  test('creates detached compact JWS', async () => {
    const jws = await signJWS(signer, 'EdDSA', { detached: true, header: {} }, message);
    const [header, payload, signature] = jws.split('.');

    expect(JSON.parse(base64url.decode(header))).toEqual({
      alg: 'EdDSA',
      b64: false,
      crit: ['b64'],
    });
    expect(payload).toBe('');
    expect(base64url.toBuffer(signature)).toHaveLength(64);
  });

  test('creates and verifies an ES256 JWS with a DID keypair adapter', async () => {
    const ecdsaKeypair = Secp256r1Keypair.fromEntropy(Uint8Array.from(
      { length: Secp256r1Keypair.SeedSize },
      (_, index) => index + 1,
    ));
    const didKeypair = {
      sign(data) {
        return ecdsaKeypair.sign(data);
      },
    };
    const jws = await signJWS(
      createJwsSigner(didKeypair),
      'ES256',
      { detached: true, header: {} },
      message,
    );
    const [header, payload, encodedSignature] = jws.split('.');
    const signature = new Uint8Array(base64url.toBuffer(encodedSignature));
    const signedData = createJws({ encodedHeader: header, verifyData: message });

    expect(payload).toBe('');
    expect(signature).toHaveLength(64);
    expect(Secp256r1Keypair.verify(
      signedData,
      joseSignatureToDER(signature),
      ecdsaKeypair.publicKey(),
    )).toBe(true);
  });

  test('creates JWS verification bytes without copying unrelated buffer data', () => {
    const backing = Uint8Array.of(9, 1, 2, 3, 9);
    const verifyData = backing.subarray(1, 4);
    const result = createJws({ encodedHeader: 'header', verifyData });

    expect(Buffer.from(result)).toEqual(Buffer.from('header.\u0001\u0002\u0003'));
  });
});

describe('credential-sdk behavior parity', () => {
  test.each([
    {
      name: 'Ed25519Keypair',
      CryptoKeypair: Ed25519Keypair,
      CredentialKeypair: CredentialEd25519Keypair,
      sourceType: 'seed',
    },
    {
      name: 'Secp256k1Keypair',
      CryptoKeypair: Secp256k1Keypair,
      CredentialKeypair: CredentialSecp256k1Keypair,
      sourceType: 'entropy',
    },
    {
      name: 'Secp256r1Keypair',
      CryptoKeypair: Secp256r1Keypair,
      CredentialKeypair: CredentialSecp256r1Keypair,
      sourceType: 'entropy',
    },
  ])('matches deterministic $name output', ({
    CryptoKeypair,
    CredentialKeypair,
    sourceType,
  }) => {
    const source = Uint8Array.from(
      { length: CryptoKeypair.SeedSize },
      (_, index) => index + 1,
    );
    const create = (Keypair) => (
      sourceType === 'seed'
        ? Keypair.fromSeed(source)
        : Keypair.fromEntropy(source)
    );
    const cryptoKeypair = create(CryptoKeypair);
    const credentialKeypair = create(CredentialKeypair);

    expect(cryptoKeypair.privateKey()).toEqual(credentialKeypair.privateKey());
    expect(cryptoKeypair.publicKey().toJSON()).toEqual(
      credentialKeypair.publicKey().toJSON(),
    );
    expect(cryptoKeypair.sign(message).toJSON()).toEqual(
      credentialKeypair.sign(message).toJSON(),
    );
  });

  test('preserves TypedEnum conversion and variant APIs', () => {
    const bytes = new Uint8Array(64);
    const localValue = new SignatureEd25519Value(bytes);
    const credentialValue = new CredentialSignatureEd25519Value(bytes);
    const localSignature = new SignatureEd25519(localValue);
    const credentialSignature = new CredentialSignatureEd25519(credentialValue);
    const json = { ed25519: localValue.toHex() };

    expect(Signature.variant(localValue).Type).toBe(
      CredentialSignature.variant(credentialValue).Type,
    );
    expect(Signature.directVariant(localSignature).Type).toBe(
      CredentialSignature.directVariant(credentialSignature).Type,
    );
    expect(Signature.isNullish).toBe(CredentialSignature.isNullish);
    expect(Signature.from(localValue).toJSON()).toEqual(
      CredentialSignature.from(credentialValue).toJSON(),
    );
    expect(Signature.fromJSON(json).toJSON()).toEqual(
      CredentialSignature.fromJSON(json).toJSON(),
    );
    expect(Signature.fromApi(localSignature).toJSON()).toEqual(
      CredentialSignature.fromApi(credentialSignature).toJSON(),
    );
  });

  test('preserves byte helper exports and representative conversions', () => {
    expect(Object.keys(cryptoBytes).sort()).toEqual(
      Object.keys(credentialBytes).sort(),
    );
    expect(cryptoBytes.normalizeToHex([0, 127, 255])).toBe(
      credentialBytes.normalizeToHex([0, 127, 255]),
    );
    expect(cryptoBytes.valueNumberOrBytes(42)).toEqual(
      credentialBytes.valueNumberOrBytes(42),
    );
  });

  test('provides individual-module default exports for deep shims', () => {
    expect(DeepSignatureEd25519Value).toBe(SignatureEd25519Value);
  });
});
