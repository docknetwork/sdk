import { Secp256r1Keypair } from '@docknetwork/crypto-utils/keypairs';

import {
  buildPaymentReceipt,
  generateSigner,
  issuePaymentReceipt,
  verifyPaymentReceipt,
} from '../src';

describe('generateSigner', () => {
  test('returns a fresh Secp256r1Keypair usable directly as an issueReceipt signer', async () => {
    const signer = generateSigner();
    expect(signer).toBeInstanceOf(Secp256r1Keypair);

    const receipt = buildPaymentReceipt({
      status: 'Success',
      iss: 'processor.example',
      iat: Math.floor(Date.now() / 1000),
      reference: 'ref-123',
      payment_id: 'PAY-001',
    });

    const jwt = await issuePaymentReceipt(signer, receipt);
    const result = verifyPaymentReceipt(jwt, {
      publicKey: signer.publicKey(),
      expectedIssuer: 'processor.example',
    });

    expect(result.verified).toBe(true);
  });

  test('generates a different keypair on each call', () => {
    const a = generateSigner();
    const b = generateSigner();
    expect(a.publicKey().value).not.toEqual(b.publicKey().value);
  });
});
