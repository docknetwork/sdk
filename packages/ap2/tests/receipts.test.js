import { createHash } from 'node:crypto';

import {
  buildPaymentReceipt,
  generateAp2KeyPair,
  importPublicJwk,
  verifyPaymentReceipt as verifyArPaymentReceipt,
} from '@ar-agents/ap2';
import {
  Ed25519Keypair,
  Secp256r1Keypair,
} from '@docknetwork/crypto-utils/keypairs';
import {
  jwkToSecp256r1PublicKey,
  secp256r1PublicKeyToJwk,
  signJWT,
} from '@docknetwork/crypto-utils/vc';

import {
  buildCheckoutReceipt as buildDockCheckoutReceipt,
  buildPaymentReceipt as buildDockPaymentReceipt,
  computeMandateReference,
  computeSdHash,
  encodeDisclosure,
  issueCheckoutReceipt,
  issuePaymentReceipt,
  signReceipt,
  verifyCheckoutReceipt,
  verifyPaymentReceipt,
} from '../src';

const paymentReceipt = {
  status: 'Success',
  iss: 'mpp.acme',
  iat: 1784397406,
  reference: 'bpIO3Tb6s_uvymkfGpUNaRwYnKTQH5S6E4n8X4cO7Zg',
  payment_id: 'PAY-001',
};
const receiptDate = new Date(paymentReceipt.iat * 1000);

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function unsignedJwt(payload, header = { alg: 'ES256', typ: 'dc+sd-jwt' }) {
  return `${encodeJson(header)}.${encodeJson(payload)}.signature`;
}

describe('AP2 receipts', () => {
  test('issues and verifies payment and checkout receipts', async () => {
    const keypair = Secp256r1Keypair.random();
    const paymentJwt = await issuePaymentReceipt(keypair, paymentReceipt, {
      kid: 'mpp-key-1',
    });
    const checkoutJwt = await issueCheckoutReceipt(keypair, {
      status: 'Success',
      iss: 'merchant.acme',
      iat: 1784397406,
      reference: 'checkout-reference',
      order_id: 'ORDER-001',
    });

    expect(verifyPaymentReceipt(paymentJwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: 'mpp.acme',
      expectedReference: paymentReceipt.reference,
      currentDate: receiptDate,
    })).toEqual({
      verified: true,
      receipt: paymentReceipt,
      protectedHeader: {
        alg: 'ES256',
        typ: 'JWT',
        kid: 'mpp-key-1',
      },
    });
    expect(verifyCheckoutReceipt(checkoutJwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: 'merchant.acme',
      currentDate: receiptDate,
    }).verified).toBe(true);
  });

  test('verifies a receipt issued by @ar-agents/ap2', async () => {
    const thirdPartyKeypair = await generateAp2KeyPair('ES256');
    const jwt = await buildPaymentReceipt({
      receipt: paymentReceipt,
      signingKey: thirdPartyKeypair.privateKey,
    });

    expect(verifyPaymentReceipt(jwt, {
      publicKey: jwkToSecp256r1PublicKey(thirdPartyKeypair.publicJwk),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    })).toMatchObject({
      verified: true,
      receipt: paymentReceipt,
    });
  });

  test('@ar-agents/ap2 verifies a receipt issued by this package', async () => {
    const keypair = Secp256r1Keypair.random();
    const jwt = await issuePaymentReceipt(keypair, paymentReceipt);
    const verificationKey = await importPublicJwk(
      secp256r1PublicKeyToJwk(keypair.publicKey()),
      'ES256',
    );

    await expect(verifyArPaymentReceipt(
      jwt,
      verificationKey,
      {
        expectedIssuer: paymentReceipt.iss,
        expectedReference: paymentReceipt.reference,
      },
    )).resolves.toEqual(paymentReceipt);
  });

  test('returns a credential-style failure result', async () => {
    const signer = Secp256r1Keypair.random();
    const verifier = Secp256r1Keypair.random();
    const jwt = await issuePaymentReceipt(signer, paymentReceipt);

    expect(verifyPaymentReceipt(jwt, {
      publicKey: verifier.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    })).toMatchObject({
      verified: false,
      error: expect.any(Error),
    });
  });

  test('enforces status-dependent checkout and payment fields', async () => {
    const keypair = Secp256r1Keypair.random();
    const common = {
      iss: 'verifier.example',
      iat: 1000,
      reference: 'mandate-reference',
    };

    expect(() => issueCheckoutReceipt(keypair, {
      ...common,
      status: 'Success',
    })).toThrow('Invalid checkout receipt');
    expect(() => issueCheckoutReceipt(keypair, {
      ...common,
      status: 'Error',
      order_id: 'ORDER-001',
      error: 'invalid_mandate',
      error_description: 'Rejected',
    })).toThrow('Invalid checkout receipt');
    expect(() => issuePaymentReceipt(keypair, {
      ...common,
      status: 'Error',
      payment_id: 'PAY-001',
      error: 'invalid_mandate',
    })).toThrow('Invalid payment receipt');
    expect(() => issuePaymentReceipt(keypair, {
      ...common,
      status: 'Error',
      payment_id: 'PAY-001',
      psp_confirmation_id: 'PSP-001',
      error: 'invalid_mandate',
      error_description: 'Rejected',
    })).toThrow('Invalid payment receipt');

    await expect(issueCheckoutReceipt(keypair, {
      ...common,
      status: 'Error',
      error: 'invalid_mandate',
      error_description: 'Rejected',
    })).resolves.toEqual(expect.any(String));

    const invalidJwt = await signJWT(keypair, {
      ...common,
      status: 'Success',
    });
    expect(verifyPaymentReceipt(invalidJwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: common.iss,
      currentDate: new Date(common.iat * 1000),
    })).toMatchObject({
      verified: false,
      error: expect.objectContaining({
        message: expect.stringContaining('Invalid payment receipt'),
      }),
    });

    const genericReceiptJwt = await signJWT(keypair, {
      ...common,
      result: 'success',
    });
    expect(verifyCheckoutReceipt(genericReceiptJwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: common.iss,
      currentDate: new Date(common.iat * 1000),
    }).verified).toBe(false);
  });

  test('requires issuer trust and enforces receipt time policy', async () => {
    const keypair = Secp256r1Keypair.random();
    const jwt = await issuePaymentReceipt(keypair, {
      ...paymentReceipt,
      iat: 1000,
    });

    expect(verifyPaymentReceipt(jwt, {
      publicKey: keypair.publicKey(),
      currentDate: new Date(1000 * 1000),
    }).error.message).toContain('"expectedIssuer" is required');
    expect(verifyPaymentReceipt(jwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: new Date(900 * 1000),
      clockTolerance: 30,
    }).error.message).toBe('Receipt "iat" is in the future');
    expect(verifyPaymentReceipt(jwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: new Date(1100 * 1000),
      maxReceiptAge: 50,
      clockTolerance: 0,
    }).error.message).toBe(
      'Receipt is older than the permitted maximum age',
    );
  });

  test('accepts only ES256 JWTs with typ JWT', async () => {
    const edKeypair = Ed25519Keypair.random();
    const edJwt = await signJWT(edKeypair, paymentReceipt);
    const esKeypair = Secp256r1Keypair.random();
    const wrongTypeJwt = await signJWT(esKeypair, paymentReceipt, {
      header: { typ: 'receipt+jwt' },
    });

    expect(verifyPaymentReceipt(edJwt, {
      publicKey: edKeypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    }).error.message).toBe('Unsupported JWT algorithm: EdDSA');
    expect(verifyPaymentReceipt(wrongTypeJwt, {
      publicKey: esKeypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    }).error.message).toBe(
      'Receipt JWT protected header "typ" must be "JWT"',
    );
  });

  test('hashes the exact final SD-JWT without its key-binding JWT', () => {
    const firstIssuer = unsignedJwt({ _sd_alg: 'sha-256', hop: 1 });
    const finalIssuer = unsignedJwt({ _sd_alg: 'sha-256', hop: 2 });
    const firstDisclosure = encodeDisclosure(['salt', 'claim', 'first']);
    const finalDisclosure = encodeDisclosure(['salt', 'claim', 'final']);
    const firstKbJwt = unsignedJwt(
      { sd_hash: 'first' },
      { alg: 'ES256', typ: 'kb+sd-jwt+kb' },
    );
    const finalKbJwt = unsignedJwt(
      { sd_hash: 'final' },
      { alg: 'ES256', typ: 'kb+sd-jwt' },
    );
    const finalPresentation = `${finalIssuer}~${finalDisclosure}~${finalKbJwt}`;
    const chain = `${firstIssuer}~${firstDisclosure}~${firstKbJwt}~~${finalPresentation}`;
    const expected = createHash('sha256')
      .update(Buffer.from(`${finalIssuer}~${finalDisclosure}~`, 'ascii'))
      .digest('base64url');

    expect(computeMandateReference(chain)).toBe(expected);
    expect(computeMandateReference(
      `${finalIssuer}~${finalDisclosure}~`,
    )).toBe(expected);
    expect(computeMandateReference(
      `${finalIssuer}~${encodeDisclosure(['salt', 'claim', 'different'])}~`,
    )).not.toBe(expected);
  });

  test('defaults mandate reference hashing to SHA-256', () => {
    const issuer = unsignedJwt({ vct: 'mandate.payment.1' });
    const presentation = `${issuer}~`;
    const expected = createHash('sha256')
      .update(Buffer.from(presentation, 'ascii'))
      .digest('base64url');

    expect(computeMandateReference(presentation)).toBe(expected);
  });

  test('uses _sd_alg and rejects unsupported mandate hash algorithms', () => {
    const issuer = unsignedJwt({ _sd_alg: 'sha-384' });
    const presentation = `${issuer}~`;
    const expected = createHash('sha384')
      .update(Buffer.from(presentation, 'ascii'))
      .digest('base64url');

    expect(computeMandateReference(presentation)).toBe(expected);
    expect(() => computeMandateReference(
      `${unsignedJwt({ _sd_alg: 'not-a-hash' })}~`,
    )).toThrow('Unsupported SD-JWT hash algorithm');
  });

  test('uses the shared SD-JWT hash primitive for mandate references', () => {
    const issuerJwt = unsignedJwt({ _sd_alg: 'sha-256' });
    const disclosures = [
      encodeDisclosure(['salt', 'claim', 'one']),
      encodeDisclosure(['salt', 'claim', 'two']),
    ];

    expect(computeMandateReference(
      `${issuerJwt}~${disclosures.join('~')}~`,
    )).toBe(computeSdHash({ issuerJwt, disclosures }));
  });

  test('builds schema-validated payloads without dropping extensions', () => {
    const extension = { network_metadata: { trace_id: 'trace-1' } };
    const builtPayment = buildDockPaymentReceipt({
      ...paymentReceipt,
      ...extension,
    });
    const builtCheckout = buildDockCheckoutReceipt({
      status: 'Error',
      iss: 'merchant.example',
      iat: 1000,
      reference: 'reference',
      error: 'invalid_mandate',
      error_description: 'Rejected',
      ...extension,
    });

    expect(builtPayment).toEqual({ ...paymentReceipt, ...extension });
    expect(builtPayment).not.toBe(paymentReceipt);
    expect(builtCheckout).toMatchObject(extension);
    expect(() => buildDockPaymentReceipt({
      ...paymentReceipt,
      error: 'invalid_mandate',
      error_description: 'Rejected',
    })).toThrow('Invalid payment receipt');
  });

  test('signs receipts with an asynchronous BYOK signer', async () => {
    const keypair = Secp256r1Keypair.random();
    const signer = {
      async sign(data) {
        await Promise.resolve();
        return keypair.sign(data);
      },
    };
    const jwt = await signReceipt(paymentReceipt, {
      signer,
      type: 'payment',
      kid: 'byok-key-1',
    });

    expect(verifyPaymentReceipt(jwt, {
      publicKey: keypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    })).toMatchObject({
      verified: true,
      receipt: paymentReceipt,
      protectedHeader: {
        alg: 'ES256',
        typ: 'JWT',
        kid: 'byok-key-1',
      },
    });
    expect(() => signReceipt(paymentReceipt)).toThrow(
      '"signer" with a sign(data) function is required',
    );
    expect(() => signReceipt(paymentReceipt, {
      signer,
      type: 'payment',
      alg: 'EdDSA',
    })).toThrow('Unsupported AP2 receipt algorithm: EdDSA');
  });

  test('verifies that a receipt references the exact mandate presentation', async () => {
    const keypair = Secp256r1Keypair.random();
    const issuer = unsignedJwt({ _sd_alg: 'sha-256' });
    const presentation = `${issuer}~${encodeDisclosure([
      'salt',
      'claim',
      'approved',
    ])}~`;
    const reference = computeMandateReference(presentation);
    const jwt = await issuePaymentReceipt(keypair, {
      ...paymentReceipt,
      reference,
    });
    const options = {
      publicKey: keypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
    };

    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandatePresentation: presentation,
    })).toMatchObject({
      verified: true,
      referenceVerified: true,
    });
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandatePresentation: `${issuer}~${encodeDisclosure([
        'salt',
        'claim',
        'changed',
      ])}~`,
    })).toMatchObject({
      verified: false,
      error: expect.objectContaining({
        message: 'Receipt reference does not match the final mandate presentation',
      }),
    });
  });

  test('composes mandate verification results and callbacks into receipt checks', async () => {
    const keypair = Secp256r1Keypair.random();
    const issuer = unsignedJwt({ _sd_alg: 'sha-256' });
    const presentation = `${issuer}~${encodeDisclosure([
      'salt',
      'claim',
      'approved',
    ])}~`;
    const reference = computeMandateReference(presentation);
    const jwt = await issuePaymentReceipt(keypair, {
      ...paymentReceipt,
      reference,
    });
    const options = {
      publicKey: keypair.publicKey(),
      expectedIssuer: paymentReceipt.iss,
      currentDate: receiptDate,
      mandatePresentation: presentation,
    };

    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: { verified: true },
    })).toMatchObject({
      verified: true,
      referenceVerified: true,
      mandateVerified: true,
    });
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: { ok: true },
    })).toMatchObject({
      verified: true,
      mandateVerified: true,
    });
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: (mandatePresentation) => {
        expect(mandatePresentation).toBe(presentation);
        return { verified: true };
      },
    })).toMatchObject({
      verified: true,
      mandateVerified: true,
    });

    const mandateError = new Error('invalid audience');
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: { verified: false, error: mandateError },
    })).toMatchObject({
      verified: false,
      error: mandateError,
    });
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: { ok: false, reason: 'delegation expired' },
    })).toMatchObject({
      verified: false,
      error: expect.objectContaining({
        message: 'delegation expired',
      }),
    });
    expect(verifyPaymentReceipt(jwt, {
      ...options,
      mandateVerification: () => Promise.resolve({ verified: true }),
    })).toMatchObject({
      verified: false,
      error: expect.objectContaining({
        message: expect.stringContaining('must be synchronous'),
      }),
    });
  });
});
