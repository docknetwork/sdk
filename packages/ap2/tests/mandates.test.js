import {
  Secp256r1Keypair,
} from '@docknetwork/crypto-utils/keypairs';
import {
  parseSdJwtPresentation,
  decodeJwtPayload,
  secp256r1PublicKeyToJwk,
  computeSdHash,
} from '@docknetwork/crypto-utils/vc';

import {
  buildOpenCheckoutMandate,
  buildClosedCheckoutMandate,
  buildOpenPaymentMandate,
  buildClosedPaymentMandate,
  signOpenCheckoutMandate,
  signClosedCheckoutMandate,
  signOpenPaymentMandate,
  signClosedPaymentMandate,
  verifyClosedCheckoutMandate,
  verifyClosedPaymentMandate,
  resolveOpenPaymentMandateContent,
  resolveOpenCheckoutMandateContent,
  computeDisclosureDigest,
  computeCheckoutHash,
} from '../src';

// The exact encoded Open Checkout Mandate token from the AP2 spec's
// checkout_mandate page (agent-provider-key-1, "example+sd-jwt"), used to
// confirm this package's digest computation matches the spec's own bytes
// rather than only being self-consistent with itself.
const VCT_CHECKOUT_OPEN = 'mandate.checkout.open.1';
const VCT_CHECKOUT_CLOSED = 'mandate.checkout.1';
const SAMPLE_CHECKOUT_JWT = 'eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig';
// The published Truvera schema requires an Open Checkout Mandate's
// constraints to contain at least one checkout.line_items entry.
const MINIMAL_LINE_ITEMS_CONSTRAINT = {
  type: 'checkout.line_items',
  items: [{ id: 'line_1', acceptable_items: [{ id: 'SKU-1', title: 'Widget' }], quantity: 1 }],
};

const SPEC_OPEN_CHECKOUT_TOKEN = 'eyJhbGciOiAiRVMyNTYiLCAidHlwIjogImV4YW1wbGUrc2Qtand0IiwgImtpZCI6ICJhZ2VudC1wcm92aWRlci1rZXktMSJ9.eyJkZWxlZ2F0ZV9wYXlsb2FkIjogW3siLi4uIjogIlF0WFRKdFdxZzk5OUNtVVdHakhGVFdNa1JQZ3VEZmVLM3dHU2FJbmQtZHcifV0sICJfc2RfYWxnIjogInNoYS0yNTYifQ.HvCGk7ye_c0LN2-NFG13wfyu3LA--rckTPGm36ugO2aRvsded7ngw1py8W3JF7wBpoQnsKr17tNTF3zLeYcoWA~WyI0bjNMXy0zX0ZtMkdneUZBRjhDdF9nIiwgeyJpZCI6ICJzdXBlcnNob2VfbGltaXRlZF9lZGl0aW9uX2dvbGRfc25lYWtlcl93b21lbnNfOV8wIiwgInRpdGxlIjogIlN1cGVyU2hvZSBMaW1pdGVkIEVkaXRpb24gR29sZCJ9XQ~WyIyelBMNnZxTEJnMldZQWRiVzktMWxRIiwgeyJpZCI6ICJtZXJjaGFudF8xIiwgIm5hbWUiOiAiRGVtbyBNZXJjaGFudCIsICJ3ZWJzaXRlIjogImh0dHBzOi8vZGVtby1tZXJjaGFudC5leGFtcGxlIn1d~WyJsYUFvV0tOUnVHbndSRWpKV1lKN3BnIiwgeyJ2Y3QiOiAibWFuZGF0ZS5jaGVja291dC5vcGVuLjEiLCAiY29uc3RyYWludHMiOiBbeyJ0eXBlIjogImNoZWNrb3V0LmxpbmVfaXRlbXMiLCAiaXRlbXMiOiBbeyJpZCI6ICJsaW5lXzEiLCAiYWNjZXB0YWJsZV9pdGVtcyI6IFt7Ii4uLiI6ICJ5M2FvY0FEMnJoWXBKUU9VTU4wMTZmYURGR2tUQkdFRFZsMVIxVFJIZGJ3In1dLCAicXVhbnRpdHkiOiAxfV19LCB7InR5cGUiOiAiY2hlY2tvdXQuYWxsb3dlZF9tZXJjaGFudHMiLCAiYWxsb3dlZCI6IFt7Ii4uLiI6ICJhNVVNQWR4Q2tfTVJheXlWZFJocElBWjBaaGpWTEVxMWcyQld5cndLVXdnIn1dfV0sICJjbmYiOiB7Imp3ayI6IHsiY3J2IjogIlAtMjU2IiwgImt0eSI6ICJFQyIsICJ4IjogIlFwU3l4UFFIeTM4eGNreXZEcjU0Z1ozVDQyemo5aUx0VjRrb3liNVUyN2MiLCAieSI6ICIzN0hMZDdKSmlueGpKSW44SjdIaWpzc29lY0JsZmhkVy1nVUw3ZmVJOWx3In19LCAiaWF0IjogMTc3NzM0MjM1NywgImV4cCI6IDE3NzczNDU5NTd9XQ~';

describe('AP2 mandates: spec byte-level verification', () => {
  test('digest computation matches the AP2 checkout_mandate spec page example', () => {
    const { issuerJwt, disclosures } = parseSdJwtPresentation(SPEC_OPEN_CHECKOUT_TOKEN);
    const payload = decodeJwtPayload(issuerJwt);

    // eslint-disable-next-line no-underscore-dangle -- protocol-mandated claim name
    expect(payload._sd_alg).toBe('sha-256');
    expect(payload.delegate_payload).toEqual([
      { '...': 'QtXTJtWqg999CmUWGjHFTWMkRPguDfeK3wGSaInd-dw' },
    ]);
    expect(disclosures).toHaveLength(3);

    const digests = disclosures.map((d) => computeDisclosureDigest(d, 'sha-256'));
    // The spec page's own pretty-printed JSON annotates the merchant
    // disclosure's digest as "...ruKUwg", but independently recomputing
    // sha256(base64url-disclosure) directly from the real compact token's
    // bytes (outside this library, via plain node:crypto) yields "...rwKUwg" —
    // a one-character typo in the docs' human-readable illustration, not a
    // bug here. The other two digests (including the top-level
    // delegate_payload digest) match the docs exactly.
    expect(digests).toEqual([
      'y3aocAD2rhYpJQOUMN016faDFGkTBGEDVl1R1TRHdbw',
      'a5UMAdxCk_MRayyVdRhpIAZ0ZhjVLEq1g2BWyrwKUwg',
      'QtXTJtWqg999CmUWGjHFTWMkRPguDfeK3wGSaInd-dw',
    ]);

    // The last disclosure's digest is the one referenced by delegate_payload.
    const contentDisclosure = disclosures[2];
    const decodedContent = JSON.parse(
      Buffer.from(contentDisclosure, 'base64url').toString('utf8'),
    );
    expect(decodedContent[1]).toMatchObject({
      vct: VCT_CHECKOUT_OPEN,
      cnf: {
        jwk: {
          crv: 'P-256',
          kty: 'EC',
          x: 'QpSyxPQHy38xckyvDr54gZ3T42zj9iLtV4koyb5U27c',
          y: '37HLd7JJinxjJIn8J7HijssoecBlfhdW-gUL7feI9lw',
        },
      },
    });
  });
});

describe('AP2 mandates: round trip', () => {
  const merchant = { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' };

  test('signs and verifies an autonomous Checkout + Payment mandate chain', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const openCheckoutContent = buildOpenCheckoutMandate({
      vct: VCT_CHECKOUT_OPEN,
      constraints: [
        {
          type: 'checkout.line_items',
          items: [
            {
              id: 'line_1',
              quantity: 1,
              acceptable_items: [{ id: 'SKU-1', title: 'Widget' }],
            },
          ],
        },
        {
          type: 'checkout.allowed_merchants',
          allowed: [merchant],
        },
      ],
      cnf,
      iat: 1000,
      exp: 4102444800, // 2100-01-01 -- resolving the Open Mandate now enforces its own expiry too
    });
    const openCheckoutPresentation = await signOpenCheckoutMandate(openCheckoutContent, {
      signer: userKeypair,
    });

    const checkoutJwt = SAMPLE_CHECKOUT_JWT;
    const closedCheckoutContent = buildClosedCheckoutMandate({
      vct: VCT_CHECKOUT_CLOSED,
      checkout_jwt: checkoutJwt,
      checkout_hash: computeCheckoutHash(checkoutJwt),
    });
    const closedCheckoutPresentation = await signClosedCheckoutMandate(closedCheckoutContent, {
      signer: agentKeypair,
      nonce: 'nonce-1',
      openMandatePresentation: openCheckoutPresentation,
    });

    const checkoutResult = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
      openMandatePresentation: openCheckoutPresentation,
    });
    expect(checkoutResult.verified).toBe(true);
    expect(checkoutResult.checkoutJwt).toBe(checkoutJwt);
    expect(checkoutResult.sdHashVerified).toBe(true);

    const conditionalTransactionId = computeSdHash(parseSdJwtPresentation(openCheckoutPresentation));
    const openPaymentContent = buildOpenPaymentMandate({
      vct: 'mandate.payment.open.1',
      constraints: [
        {
          type: 'payment.amount_range', currency: 'USD', min: 0, max: 20000,
        },
        { type: 'payment.allowed_payees', allowed: [merchant] },
        { type: 'payment.reference', conditional_transaction_id: conditionalTransactionId },
      ],
      cnf,
      iat: 1000,
      exp: 4102444800, // 2100-01-01 -- resolving the Open Mandate now enforces its own expiry too
    });
    const openPaymentPresentation = await signOpenPaymentMandate(openPaymentContent, {
      signer: userKeypair,
    });

    const closedPaymentContent = buildClosedPaymentMandate({
      vct: 'mandate.payment.1',
      transaction_id: computeCheckoutHash(checkoutJwt),
      payee: merchant,
      payment_amount: { amount: 19900, currency: 'USD' },
      payment_instrument: { id: 'stub', type: 'card', description: 'Card ****4242' },
    });
    const closedPaymentPresentation = await signClosedPaymentMandate(closedPaymentContent, {
      signer: agentKeypair,
      nonce: 'nonce-2',
      openMandatePresentation: openPaymentPresentation,
    });

    const paymentResult = verifyClosedPaymentMandate(closedPaymentPresentation, {
      checkoutJwt,
      openMandatePresentation: openPaymentPresentation,
    });
    expect(paymentResult.verified).toBe(true);
    expect(paymentResult.transactionIdVerified).toBe(true);
    expect(paymentResult.sdHashVerified).toBe(true);
  });

  test('rejects a Closed Checkout Mandate with a tampered checkout_hash', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf,
      }),
      { signer: userKeypair },
    );

    const checkoutJwt = SAMPLE_CHECKOUT_JWT;
    const closedCheckoutPresentation = await signClosedCheckoutMandate(
      buildClosedCheckoutMandate({
        vct: VCT_CHECKOUT_CLOSED,
        checkout_jwt: checkoutJwt,
        checkout_hash: 'not-the-real-hash',
      }),
      {
        signer: agentKeypair,
        nonce: 'nonce-1',
        openMandatePresentation: openCheckoutPresentation,
      },
    );

    const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
      openMandatePresentation: openCheckoutPresentation,
    });
    expect(result.verified).toBe(false);
    expect(result.error.message).toMatch(/checkout_hash/);
  });

  test('rejects a Closed Checkout Mandate closed by an unauthorized key', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const otherKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf,
      }),
      { signer: userKeypair },
    );

    const checkoutJwt = SAMPLE_CHECKOUT_JWT;
    // otherKeypair is not the key endorsed in the Open Mandate's cnf.jwk.
    const closedCheckoutPresentation = await signClosedCheckoutMandate(
      buildClosedCheckoutMandate({
        vct: VCT_CHECKOUT_CLOSED,
        checkout_jwt: checkoutJwt,
        checkout_hash: computeCheckoutHash(checkoutJwt),
      }),
      {
        signer: otherKeypair,
        nonce: 'nonce-1',
        openMandatePresentation: openCheckoutPresentation,
      },
    );

    const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
      openMandatePresentation: openCheckoutPresentation,
    });
    expect(result.verified).toBe(false);
  });
});

describe('AP2 mandates: resolveOpenPaymentMandateContent', () => {
  const merchant = { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' };
  const instrument = { id: 'card_1', type: 'card', description: 'Card ****4242' };

  test('resolves budget, allowed_payees, and allowed_payment_instruments constraints', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const presentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [
          { type: 'payment.budget', max: 20000, currency: 'USD' },
          { type: 'payment.allowed_payees', allowed: [merchant] },
          { type: 'payment.allowed_payment_instruments', allowed: [instrument] },
          { type: 'payment.reference', conditional_transaction_id: 'digest-1' },
        ],
        cnf,
      }),
      { signer: userKeypair },
    );

    const { content, protectedHeader } = resolveOpenPaymentMandateContent(presentation);

    expect(content.cnf).toEqual(cnf);
    expect(protectedHeader.typ).toBe('dc+sd-jwt');
    expect(content.constraints).toEqual(
      expect.arrayContaining([
        { type: 'payment.budget', max: 20000, currency: 'USD' },
        { type: 'payment.allowed_payees', allowed: [merchant] },
        { type: 'payment.allowed_payment_instruments', allowed: [instrument] },
      ]),
    );
  });

  test('rejects a hand-edited presentation whose content no longer matches its digest', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const presentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [
          { type: 'payment.budget', max: 100, currency: 'USD' },
          { type: 'payment.reference', conditional_transaction_id: 'digest-1' },
        ],
        cnf,
      }),
      { signer: userKeypair },
    );

    // Hand-edit the content disclosure (the last '~'-delimited segment) to
    // claim a much larger budget, without re-signing.
    const parts = presentation.split('~');
    const contentDisclosure = parts[parts.length - 2];
    const decoded = JSON.parse(Buffer.from(contentDisclosure, 'base64url').toString('utf8'));
    decoded[1].constraints[0].max = 999999999;
    const tamperedDisclosure = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const tamperedPresentation = [...parts.slice(0, -2), tamperedDisclosure, ''].join('~');

    expect(() => resolveOpenPaymentMandateContent(tamperedPresentation)).toThrow(
      /No disclosure found/,
    );
  });

  test('rejects an expired Open Payment Mandate', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const presentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [{ type: 'payment.reference', conditional_transaction_id: 'digest-1' }],
        cnf,
        iat: 1000,
        exp: 2000,
      }),
      { signer: userKeypair },
    );

    expect(() => resolveOpenPaymentMandateContent(presentation, {
      currentDate: new Date(3000 * 1000),
    })).toThrow(/expired/);
  });

  test('accepts a mandate with no exp -- no expiry enforced', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const presentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [{ type: 'payment.reference', conditional_transaction_id: 'digest-1' }],
        cnf,
      }),
      { signer: userKeypair },
    );

    const { content } = resolveOpenPaymentMandateContent(presentation, {
      currentDate: new Date(Date.now() + 1000 * 365 * 24 * 60 * 60 * 1000),
    });
    expect(content.vct).toBe('mandate.payment.open.1');
  });
});

describe('AP2 mandates: resolveOpenCheckoutMandateContent', () => {
  test('resolves line_items and allowed_merchants constraints', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const merchant = { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' };

    const presentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [
          MINIMAL_LINE_ITEMS_CONSTRAINT,
          { type: 'checkout.allowed_merchants', allowed: [merchant] },
        ],
        cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );

    const { content } = resolveOpenCheckoutMandateContent(presentation);
    expect(content.constraints).toEqual([
      MINIMAL_LINE_ITEMS_CONSTRAINT,
      { type: 'checkout.allowed_merchants', allowed: [merchant] },
    ]);
    expect(content.cnf.jwk).toMatchObject({ crv: 'P-256', kty: 'EC' });
  });

  test('rejects a hand-edited presentation whose content no longer matches its digest', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();

    const presentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );

    const parts = presentation.split('~');
    const contentDisclosure = parts[parts.length - 2];
    const decoded = JSON.parse(Buffer.from(contentDisclosure, 'base64url').toString('utf8'));
    decoded[1].constraints[0].items[0].quantity = 999;
    const tamperedDisclosure = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const tamperedPresentation = [...parts.slice(0, -2), tamperedDisclosure, ''].join('~');

    expect(() => resolveOpenCheckoutMandateContent(tamperedPresentation)).toThrow(
      /No disclosure found/,
    );
  });

  test('rejects an expired Open Checkout Mandate', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();

    const presentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
        iat: 1000,
        exp: 2000,
      }),
      { signer: userKeypair },
    );

    expect(() => resolveOpenCheckoutMandateContent(presentation, {
      currentDate: new Date(3000 * 1000),
    })).toThrow(/expired/);
  });
});

describe('AP2 mandates: cnf is derived from the Open Mandate, not trusted from the caller', () => {
  test('verifyClosedCheckoutMandate rejects a mandate closed by an unauthorized key', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const authorizedAgentKeypair = Secp256r1Keypair.random();
    const attackerKeypair = Secp256r1Keypair.random();

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        // Only authorizedAgentKeypair is endorsed to close this mandate.
        cnf: { jwk: secp256r1PublicKeyToJwk(authorizedAgentKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );

    // The attacker signs their own Closed Checkout Mandate against the same
    // Open Mandate, using their own key instead of the authorized one.
    const closedCheckoutPresentation = await signClosedCheckoutMandate(
      buildClosedCheckoutMandate({
        vct: VCT_CHECKOUT_CLOSED,
        checkout_jwt: SAMPLE_CHECKOUT_JWT,
        checkout_hash: computeCheckoutHash(SAMPLE_CHECKOUT_JWT),
      }),
      {
        signer: attackerKeypair,
        nonce: 'nonce-1',
        openMandatePresentation: openCheckoutPresentation,
      },
    );

    // The verification key is always derived from the Open Mandate's own
    // cnf.jwk -- verifyClosedCheckoutMandate has no caller-supplied-key
    // option that could be used to bless the attacker's key instead.
    const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
      openMandatePresentation: openCheckoutPresentation,
    });
    expect(result.verified).toBe(false);
  });

  test('verifyClosedPaymentMandate rejects a mandate closed by an unauthorized key', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const authorizedAgentKeypair = Secp256r1Keypair.random();
    const attackerKeypair = Secp256r1Keypair.random();

    const openPaymentPresentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [{ type: 'payment.reference', conditional_transaction_id: 'digest-1' }],
        cnf: { jwk: secp256r1PublicKeyToJwk(authorizedAgentKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );

    const closedPaymentPresentation = await signClosedPaymentMandate(
      buildClosedPaymentMandate({
        vct: 'mandate.payment.1',
        transaction_id: computeCheckoutHash(SAMPLE_CHECKOUT_JWT),
        payee: { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' },
        payment_amount: { amount: 19900, currency: 'USD' },
        payment_instrument: { id: 'stub', type: 'card', description: 'Card ****4242' },
      }),
      {
        signer: attackerKeypair,
        nonce: 'nonce-1',
        openMandatePresentation: openPaymentPresentation,
      },
    );

    const result = verifyClosedPaymentMandate(closedPaymentPresentation, {
      openMandatePresentation: openPaymentPresentation,
    });
    expect(result.verified).toBe(false);
  });

  test('verifyClosedCheckoutMandate requires openMandatePresentation -- there is no caller-supplied-key fallback', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf,
      }),
      { signer: userKeypair },
    );
    const closedCheckoutPresentation = await signClosedCheckoutMandate(
      buildClosedCheckoutMandate({
        vct: VCT_CHECKOUT_CLOSED,
        checkout_jwt: SAMPLE_CHECKOUT_JWT,
        checkout_hash: computeCheckoutHash(SAMPLE_CHECKOUT_JWT),
      }),
      { signer: agentKeypair, nonce: 'nonce-1', openMandatePresentation: openCheckoutPresentation },
    );

    const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {});
    expect(result.verified).toBe(false);
    expect(result.error.message).toMatch(/openMandatePresentation/);
  });

  test('verifyClosedPaymentMandate requires openMandatePresentation -- there is no caller-supplied-key fallback', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();
    const cnf = { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) };

    const openPaymentPresentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [{ type: 'payment.reference', conditional_transaction_id: 'digest-1' }],
        cnf,
      }),
      { signer: userKeypair },
    );
    const closedPaymentPresentation = await signClosedPaymentMandate(
      buildClosedPaymentMandate({
        vct: 'mandate.payment.1',
        transaction_id: computeCheckoutHash(SAMPLE_CHECKOUT_JWT),
        payee: { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' },
        payment_amount: { amount: 19900, currency: 'USD' },
        payment_instrument: { id: 'stub', type: 'card', description: 'Card ****4242' },
      }),
      { signer: agentKeypair, nonce: 'nonce-1', openMandatePresentation: openPaymentPresentation },
    );

    const result = verifyClosedPaymentMandate(closedPaymentPresentation, {});
    expect(result.verified).toBe(false);
    expect(result.error.message).toMatch(/openMandatePresentation/);
  });
});

describe('AP2 mandates: payment.reference binding', () => {
  const merchant = { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' };

  async function buildBoundClosedPaymentMandate(userKeypair, agentKeypair, conditionalTransactionId) {
    const openPaymentPresentation = await signOpenPaymentMandate(
      buildOpenPaymentMandate({
        vct: 'mandate.payment.open.1',
        constraints: [{ type: 'payment.reference', conditional_transaction_id: conditionalTransactionId }],
        cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );
    const closedPaymentPresentation = await signClosedPaymentMandate(
      buildClosedPaymentMandate({
        vct: 'mandate.payment.1',
        transaction_id: computeCheckoutHash(SAMPLE_CHECKOUT_JWT),
        payee: merchant,
        payment_amount: { amount: 19900, currency: 'USD' },
        payment_instrument: { id: 'stub', type: 'card', description: 'Card ****4242' },
      }),
      { signer: agentKeypair, nonce: 'nonce-1', openMandatePresentation: openPaymentPresentation },
    );
    return { openPaymentPresentation, closedPaymentPresentation };
  }

  test('verifies payment.reference against a fresh sd_hash of the supplied Open Checkout Mandate', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf: { jwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );
    const conditionalTransactionId = computeSdHash(parseSdJwtPresentation(openCheckoutPresentation));
    const { openPaymentPresentation, closedPaymentPresentation } = await buildBoundClosedPaymentMandate(
      userKeypair,
      agentKeypair,
      conditionalTransactionId,
    );

    const result = verifyClosedPaymentMandate(closedPaymentPresentation, {
      openMandatePresentation: openPaymentPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
    });
    expect(result.verified).toBe(true);
    expect(result.referenceVerified).toBe(true);
  });

  test('fails referenceVerified when payment.reference points at a different checkout', async () => {
    const userKeypair = Secp256r1Keypair.random();
    const agentKeypair = Secp256r1Keypair.random();

    const openCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf: { jwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );
    const unrelatedCheckoutPresentation = await signOpenCheckoutMandate(
      buildOpenCheckoutMandate({
        vct: VCT_CHECKOUT_OPEN,
        constraints: [MINIMAL_LINE_ITEMS_CONSTRAINT],
        cnf: { jwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()) },
      }),
      { signer: userKeypair },
    );
    const wrongTransactionId = computeSdHash(parseSdJwtPresentation(unrelatedCheckoutPresentation));
    const { openPaymentPresentation, closedPaymentPresentation } = await buildBoundClosedPaymentMandate(
      userKeypair,
      agentKeypair,
      wrongTransactionId,
    );

    const result = verifyClosedPaymentMandate(closedPaymentPresentation, {
      openMandatePresentation: openPaymentPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
    });
    expect(result.verified).toBe(true);
    expect(result.referenceVerified).toBe(false);
  });
});
