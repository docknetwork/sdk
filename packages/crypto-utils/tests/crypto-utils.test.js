import { createHash } from 'node:crypto';

import base64url from 'base64url';

import {
  Ed25519Keypair,
  Signature,
  SignatureEd25519,
  SignatureEd25519Value,
  Secp256k1Keypair,
  Secp256r1Keypair,
  computeSdHash,
  createJws,
  createJwsSigner,
  createRawSigner,
  decodeJwtPayload,
  joseSignatureToDER,
  jwkToSecp256r1PublicKey,
  parseFinalSdJwtPresentation,
  parseSdJwtPresentation,
  secp256r1PublicKeyToJwk,
  signJWT,
  signJWS,
  verifyJWT,
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

  test('decodes JWT payloads and computes SD-JWT presentation hashes', () => {
    const issuerPayload = { _sd_alg: 'sha-256', vct: 'mandate.payment.1' };
    const issuerJwt = [
      base64url.encode(JSON.stringify({ alg: 'ES256' })),
      base64url.encode(JSON.stringify(issuerPayload)),
      'signature',
    ].join('.');
    const disclosure = base64url.encode(JSON.stringify([
      'salt',
      'payment_id',
      'PAY-001',
    ]));
    const expected = createHash('sha256')
      .update(Buffer.from(`${issuerJwt}~${disclosure}~`, 'ascii'))
      .digest('base64url');
    const kbJwt = [
      base64url.encode(JSON.stringify({ alg: 'ES256', typ: 'kb+jwt' })),
      base64url.encode(JSON.stringify({ sd_hash: expected })),
      'kb-signature',
    ].join('.');
    const presentation = `${issuerJwt}~${disclosure}~${kbJwt}`;

    expect(decodeJwtPayload(issuerJwt)).toEqual(issuerPayload);
    expect(parseSdJwtPresentation(presentation)).toEqual({
      issuerJwt,
      disclosures: [disclosure],
      kbJwt,
    });
    expect(parseFinalSdJwtPresentation(
      `${issuerJwt}~~~${presentation}`,
    )).toEqual({
      issuerJwt,
      disclosures: [disclosure],
      kbJwt,
    });
    expect(computeSdHash({
      issuerJwt,
      disclosures: [disclosure],
    })).toBe(expected);
  });

  test('converts P-256 public keys to and from JWK', () => {
    const keypair = Secp256r1Keypair.random();
    const publicKey = keypair.publicKey();
    const jwk = secp256r1PublicKeyToJwk(publicKey);

    expect(jwk).toMatchObject({ kty: 'EC', crv: 'P-256' });
    expect(jwkToSecp256r1PublicKey(jwk)).toEqual(
      cryptoBytes.valueBytes(publicKey),
    );
    expect(() => jwkToSecp256r1PublicKey({
      ...jwk,
      crv: 'secp256k1',
    })).toThrow('Expected a public P-256 EC JWK');
  });

  test.each([
    {
      algorithm: 'EdDSA',
      Keypair: Ed25519Keypair,
      sourceType: 'seed',
    },
    {
      algorithm: 'ES256K',
      Keypair: Secp256k1Keypair,
      sourceType: 'entropy',
    },
    {
      algorithm: 'ES256',
      Keypair: Secp256r1Keypair,
      sourceType: 'entropy',
    },
  ])('signs and verifies a $algorithm JWT', async ({
    algorithm,
    Keypair,
    sourceType,
  }) => {
    const source = Uint8Array.from(
      { length: Keypair.SeedSize },
      (_, index) => index + 1,
    );
    const jwtKeypair = sourceType === 'seed'
      ? Keypair.fromSeed(source)
      : Keypair.fromEntropy(source);
    const payload = { algorithm };
    const jwt = await signJWT(jwtKeypair, payload);

    expect(verifyJWT(jwt, jwtKeypair.publicKey())).toEqual({
      verified: true,
      payload,
      protectedHeader: {
        alg: algorithm,
        typ: 'JWT',
      },
    });
  });

  test('signs and verifies an ES256 JWT', async () => {
    const es256Keypair = Secp256r1Keypair.fromEntropy(Uint8Array.from(
      { length: Secp256r1Keypair.SeedSize },
      (_, index) => index + 1,
    ));
    const payload = { iss: 'mpp.acme', payment_id: 'PAY-001' };
    const jwt = await signJWT(es256Keypair, payload, {
      header: { kid: 'mpp-key-1' },
    });

    expect(verifyJWT(jwt, es256Keypair.publicKey())).toEqual({
      verified: true,
      payload,
      protectedHeader: {
        alg: 'ES256',
        typ: 'JWT',
        kid: 'mpp-key-1',
      },
    });
  });

  test('enforces algorithm allowlists', async () => {
    const jwtKeypair = Ed25519Keypair.random();
    const jwt = await signJWT(jwtKeypair, { status: 'Success' });
    const result = verifyJWT(jwt, jwtKeypair.publicKey(), {
      algorithms: ['ES256'],
    });

    expect(result.verified).toBe(false);
    expect(result.error.message).toBe('Unsupported JWT algorithm: EdDSA');
  });

  test('rejects signing algorithm and key type mismatches', () => {
    expect(() => signJWT(
      Ed25519Keypair.random(),
      { status: 'Success' },
      { algorithm: 'ES256' },
    )).toThrow('JWT algorithm ES256 does not match signing key type');
  });

  test('supports untyped signer adapters with an explicit algorithm', async () => {
    const keypair = Ed25519Keypair.random();
    const signer = { sign: (data) => keypair.sign(data) };
    const jwt = await signJWT(
      signer,
      { status: 'Success' },
      { algorithm: 'EdDSA' },
    );

    expect(verifyJWT(jwt, keypair.publicKey()).verified).toBe(true);
  });

  test('supports asynchronous signer adapters', async () => {
    const keypair = Secp256r1Keypair.random();
    const signer = {
      async sign(data) {
        await Promise.resolve();
        return keypair.sign(data);
      },
    };
    const jwt = await signJWT(
      signer,
      { status: 'Success' },
      { algorithm: 'ES256' },
    );

    expect(verifyJWT(jwt, keypair.publicKey()).verified).toBe(true);
  });

  test('infers the algorithm from wrapped DID keypairs', async () => {
    const keyPair = Secp256k1Keypair.random();
    const didKeypair = {
      keyPair,
      sign: (data) => keyPair.sign(data),
    };
    const jwt = await signJWT(didKeypair, { status: 'Success' });

    expect(verifyJWT(jwt, keyPair.publicKey())).toMatchObject({
      verified: true,
      protectedHeader: { alg: 'ES256K' },
    });
  });

  test('rejects protected header algorithm overrides', () => {
    expect(() => signJWT(
      Ed25519Keypair.random(),
      { status: 'Success' },
      { header: { alg: 'ES256' } },
    )).toThrow(
      'JWT header algorithm ES256 does not match signing algorithm EdDSA',
    );
  });

  test('rejects verification algorithm and key type mismatches', async () => {
    const signer = Ed25519Keypair.random();
    const jwt = await signJWT(signer, { status: 'Success' });
    const result = verifyJWT(jwt, Secp256r1Keypair.random().publicKey());

    expect(result.verified).toBe(false);
    expect(result.error.message).toBe(
      'JWT algorithm EdDSA does not match public key type',
    );
  });

  test('returns a failed result for an invalid JWT signature', async () => {
    const signer = Secp256r1Keypair.random();
    const verifier = Secp256r1Keypair.random();
    const jwt = await signJWT(signer, { status: 'Success' });
    const result = verifyJWT(jwt, verifier.publicKey());

    expect(result.verified).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
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
