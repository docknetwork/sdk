import {
  buildPaymentReceipt,
  computeMandateReference,
  signReceipt,
  verifyPaymentReceipt,
} from '@docknetwork/ap2';
import { Secp256r1Keypair } from '@docknetwork/crypto-utils/keypairs';

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// This synthetic presentation keeps the example self-contained. In production,
// use the exact closed mandate presentation that was fully verified.
const issuerJwt = [
  encodeJson({ alg: 'ES256', typ: 'dc+sd-jwt' }),
  encodeJson({ _sd_alg: 'sha-256', vct: 'mandate.payment.1' }),
  'example-signature',
].join('.');
const disclosure = encodeJson([
  'example-salt',
  'payment_id',
  'PAY-001',
]);
const closedMandatePresentation = `${issuerJwt}~${disclosure}~`;

const processorKeypair = Secp256r1Keypair.random();
const issuer = 'https://processor.example';
const receipt = buildPaymentReceipt({
  status: 'Success',
  iss: issuer,
  iat: Math.floor(Date.now() / 1000),
  reference: computeMandateReference(closedMandatePresentation),
  payment_id: 'PAY-001',
  psp_confirmation_id: 'PSP-789',
});

const receiptJwt = await signReceipt(receipt, {
  signer: processorKeypair,
  type: 'payment',
  kid: `${issuer}#receipt-key-1`,
});

// In production, await a real mandate verifier (signatures, delegation, etc.)
// and pass its result here. This stub shows the composition point.
const mandateVerification = { verified: true };

const verification = verifyPaymentReceipt(receiptJwt, {
  publicKey: processorKeypair.publicKey(),
  expectedIssuer: issuer,
  mandatePresentation: closedMandatePresentation,
  mandateVerification,
  maxReceiptAge: 300,
});

if (!verification.verified) {
  throw verification.error;
}

console.log('Receipt JWT:', receiptJwt);
console.log('Verified receipt:', verification.receipt);
console.log('Mandate reference verified:', verification.referenceVerified);
console.log('Mandate verified:', verification.mandateVerified);
