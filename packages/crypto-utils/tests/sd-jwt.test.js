import { createHash } from 'node:crypto';

import {
  generateAp2KeyPair,
  issueClosedPaymentMandate,
  verifyClosedPaymentMandate,
} from '@ar-agents/ap2';
import { digest, generateSalt } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import base64url from 'base64url';

import {
  Ed25519Keypair,
  Secp256k1Keypair,
  Secp256r1Keypair,
  computeSdHash,
  createJwsSigner,
  decodeJwtPayload,
  isSDJWTCredential,
  jwkToSecp256r1PublicKey,
  parseFinalSdJwtPresentation,
  parseSdJwtPresentation,
  secp256r1PublicKeyToJwk,
  verifySDJWTCredential,
} from '../src';

async function issueTestSdJwt(keypair, algorithm, claims, disclosureFrame, header = {}) {
  const signer = createJwsSigner(keypair);
  const sdjwt = new SDJwtVcInstance({
    signer: async (data) => {
      const bytes = typeof data === 'string' ? Buffer.from(data) : data;
      const signature = await signer.sign({ data: bytes });
      return Buffer.from(signature).toString('base64url');
    },
    signAlg: algorithm,
    hasher: digest,
    hashAlg: 'sha-256',
    saltGenerator: generateSalt,
  });

  return sdjwt.issue(claims, disclosureFrame, {
    header: {
      typ: 'vc+sd-jwt',
      alg: algorithm,
      ...header,
    },
  });
}

describe('SD-JWT helpers', () => {
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
});

describe('SD-JWT credential verification', () => {
  test('detects SD-JWT credentials by header typ', () => {
    const vcHeader = base64url.encode(JSON.stringify({ typ: 'vc+sd-jwt', alg: 'EdDSA' }));
    const dcHeader = base64url.encode(JSON.stringify({ typ: 'dc+sd-jwt', alg: 'ES256' }));
    const jwtHeader = base64url.encode(JSON.stringify({ typ: 'JWT', alg: 'EdDSA' }));

    expect(isSDJWTCredential(`${vcHeader}.PAY.SIG`)).toBe(true);
    expect(isSDJWTCredential(`${dcHeader}.PAY.SIG`)).toBe(true);
    expect(isSDJWTCredential(`${jwtHeader}.PAY.SIG`)).toBe(false);
    expect(isSDJWTCredential({ not: 'a string' })).toBe(false);
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
  ])('issues and verifies a $algorithm SD-JWT with keyResolver', async ({
    algorithm,
    Keypair,
    sourceType,
  }) => {
    const source = Uint8Array.from(
      { length: Keypair.SeedSize },
      (_, index) => index + 1,
    );
    const keypair = sourceType === 'seed'
      ? Keypair.fromSeed(source)
      : Keypair.fromEntropy(source);
    const iss = `did:ex:issuer#${algorithm.toLowerCase()}`;
    const encoded = await issueTestSdJwt(
      keypair,
      algorithm,
      {
        iss,
        iat: 1700000000,
        exp: 1800000000,
        vct: 'MyType',
        givenName: 'Alice',
      },
      { _sd: ['givenName'] },
    );

    const result = await verifySDJWTCredential(encoded, ['givenName'], {
      keyResolver: async (id) => {
        expect(id).toBe(iss);
        return keypair.publicKey();
      },
    });

    expect(result).toMatchObject({
      verified: true,
      errors: [],
      results: [],
      credentialResults: [{
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        issuer: 'did:ex:issuer',
        type: ['MyType'],
        issuanceDate: new Date(1700000000 * 1000).toISOString(),
        expirationDate: new Date(1800000000 * 1000).toISOString(),
        credentialSubject: { givenName: 'Alice' },
        proof: null,
      }],
    });

    const asObject = await verifySDJWTCredential({ jwt: encoded }, undefined, {
      keyResolver: async () => keypair.publicKey(),
    });
    expect(asObject.verified).toBe(true);
  });

  test('verifies ES256 SD-JWT using embedded cnf.jwk without keyResolver', async () => {
    const keypair = Secp256r1Keypair.fromEntropy(Uint8Array.from(
      { length: Secp256r1Keypair.SeedSize },
      (_, index) => index + 1,
    ));
    const jwk = secp256r1PublicKeyToJwk(keypair.publicKey());
    const keyResolver = jest.fn();
    const encoded = await issueTestSdJwt(
      keypair,
      'ES256',
      {
        iss: 'did:ex:issuer#es256',
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Bob',
        cnf: { jwk },
      },
      { _sd: ['givenName'] },
      { jwk },
    );

    const result = await verifySDJWTCredential(encoded, ['givenName'], {
      keyResolver,
    });

    expect(keyResolver).not.toHaveBeenCalled();
    expect(result.verified).toBe(true);
    expect(result.credentialResults[0].credentialSubject).toEqual({
      givenName: 'Bob',
      cnf: { jwk },
    });
  });

  test('resolves issuer keys through documentLoader', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 1,
    ));
    const iss = 'did:ex:issuer#keys-1';
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iss,
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Carol',
      },
      { _sd: ['givenName'] },
      { kid: iss },
    );

    const result = await verifySDJWTCredential(encoded, ['givenName'], {
      documentLoader: async (uri) => {
        expect(uri).toBe(iss);
        return {
          document: {
            id: 'did:ex:issuer',
            verificationMethod: [{
              id: iss,
              type: 'Ed25519VerificationKey2018',
              publicKey: keypair.publicKey(),
            }],
          },
          documentUrl: uri,
          contextUrl: null,
        };
      },
    });

    expect(result.verified).toBe(true);
    expect(result.credentialResults[0].credentialSubject).toEqual({
      givenName: 'Carol',
    });
  });

  test('resolves issuer keys through resolver', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 2,
    ));
    const iss = 'did:ex:issuer#keys-2';
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iss,
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Dana',
      },
      { _sd: ['givenName'] },
    );

    const result = await verifySDJWTCredential(encoded, ['givenName'], {
      resolver: {
        supports: (uri) => uri.startsWith('did:ex:'),
        resolve: async () => keypair.publicKey(),
      },
    });

    expect(result.verified).toBe(true);
  });

  test('rejects passing both resolver and documentLoader', async () => {
    const header = base64url.encode(JSON.stringify({ typ: 'vc+sd-jwt', alg: 'EdDSA' }));
    await expect(verifySDJWTCredential(`${header}.PAY.SIG~`, undefined, {
      documentLoader: async () => ({ document: {} }),
      resolver: { supports: () => true, resolve: async () => ({}) },
    })).rejects.toThrow(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  });

  test('throws when issuer key cannot be resolved', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 3,
    ));
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Eve',
      },
      { _sd: ['givenName'] },
    );

    await expect(verifySDJWTCredential(encoded)).rejects.toThrow(
      'Issuer key not found in SDJWT iss property',
    );
  });

  test('fails verification when required claims are missing', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 4,
    ));
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iss: 'did:ex:issuer#keys-1',
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Frank',
      },
      { _sd: ['givenName'] },
    );

    await expect(verifySDJWTCredential(encoded, ['familyName'], {
      keyResolver: async () => keypair.publicKey(),
    })).rejects.toThrow();
  });

  test('fails verification with the wrong public key', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 5,
    ));
    const other = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 6,
    ));
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iss: 'did:ex:issuer#keys-1',
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Grace',
      },
      { _sd: ['givenName'] },
    );

    await expect(verifySDJWTCredential(encoded, ['givenName'], {
      keyResolver: async () => other.publicKey(),
    })).rejects.toThrow();
  });

  test('verifies using an LD-style keyResolver with verifier()', async () => {
    const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(
      { length: Ed25519Keypair.SeedSize },
      (_, index) => index + 7,
    ));
    const encoded = await issueTestSdJwt(
      keypair,
      'EdDSA',
      {
        iss: 'did:ex:issuer#keys-1',
        iat: 1700000000,
        vct: 'MyType',
        givenName: 'Heidi',
      },
      { _sd: ['givenName'] },
    );

    const result = await verifySDJWTCredential(encoded, ['givenName'], {
      keyResolver: async () => ({
        type: 'Ed25519VerificationKey2020',
        verifier: () => ({
          verify: async ({ data, signature }) => {
            const verifyData = typeof data === 'string'
              ? Buffer.from(data)
              : data;
            return Ed25519Keypair.verify(
              verifyData,
              signature,
              keypair.publicKey(),
            );
          },
        }),
      }),
    });

    expect(result.verified).toBe(true);
    expect(result.credentialResults[0].credentialSubject).toEqual({
      givenName: 'Heidi',
    });
  });

  test('verifies a closed payment mandate SD-JWT from the AP2 flow', async () => {
    const agent = await generateAp2KeyPair('ES256');
    const transactionId = 'checkout-hash-ap2-001';
    const iat = 1700000000;
    const presentation = await issueClosedPaymentMandate({
      mandate: {
        vct: 'mandate.payment.1',
        transaction_id: transactionId,
        payee: { id: 'merchant_1' },
        payment_amount: { amount: 19900, currency: 'USD' },
        payment_instrument: { id: 'card_x', type: 'card' },
        iss: 'did:ex:shopping-agent',
        iat,
      },
      signingCtx: {
        privateKey: agent.privateKey,
        alg: 'ES256',
        typ: 'dc+sd-jwt',
      },
    });

    expect(isSDJWTCredential(presentation)).toBe(true);

    const arAgentsResult = await verifyClosedPaymentMandate(presentation, {
      issuerKey: agent.publicJwk,
      expectedTransactionId: transactionId,
    });
    expect(arAgentsResult.ok).toBe(true);

    const result = await verifySDJWTCredential(
      presentation,
      ['payment_amount', 'payment_instrument'],
      {
        keyResolver: async (iss) => {
          expect(iss).toBe('did:ex:shopping-agent');
          return jwkToSecp256r1PublicKey(agent.publicJwk);
        },
      },
    );

    expect(result).toMatchObject({
      verified: true,
      errors: [],
      results: [],
      credentialResults: [{
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        issuer: 'did:ex:shopping-agent',
        type: ['mandate.payment.1'],
        issuanceDate: new Date(iat * 1000).toISOString(),
        credentialSubject: {
          transaction_id: transactionId,
          payee: { id: 'merchant_1' },
          payment_amount: { amount: 19900, currency: 'USD' },
          payment_instrument: { id: 'card_x', type: 'card' },
        },
        proof: null,
      }],
    });
  });
});
