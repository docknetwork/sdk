import {
  buildOpenCheckoutMandate,
  signOpenCheckoutMandate,
  buildClosedCheckoutMandate,
  signClosedCheckoutMandate,
  verifyClosedCheckoutMandate,
  computeCheckoutHash,
} from '@docknetwork/ap2';
import { Secp256r1Keypair } from '@docknetwork/crypto-utils/keypairs';
import { jwkToSecp256r1PublicKey, secp256r1PublicKeyToJwk } from '@docknetwork/crypto-utils/vc';

// verifyClosedCheckoutMandate/verifyClosedPaymentMandate require a
// `userPublicKey` -- the User's own key, verified against the Open Mandate's
// issuer signature, so that the cnf.jwk delegation inside it can be trusted
// as actually coming from that User rather than an entirely self-forged
// chain. This package deliberately has no opinion on *how* you get that key:
// it's an external trust decision, not something derivable from the mandate
// presentation itself. This example shows the shape of that lookup when the
// User is identified by a DID.

// Stands in for a real DID resolver (e.g. a universal resolver, `did:web`
// over HTTPS, or `@docknetwork/credential-sdk`'s DID resolution module).
// What matters for this example is only the shape of what comes back: a DID
// Document whose `verificationMethod` entries carry a `publicKeyJwk`.
async function resolveDid(did, registry) {
  const didDocument = registry.get(did);
  if (!didDocument) {
    throw new Error(`Unable to resolve "${did}"`);
  }
  return didDocument;
}

function userPublicKeyFromDidDocument(didDocument) {
  const verificationMethod = didDocument.verificationMethod?.[0];
  if (verificationMethod?.publicKeyJwk == null) {
    throw new Error('DID document has no usable publicKeyJwk verification method');
  }
  return jwkToSecp256r1PublicKey(verificationMethod.publicKeyJwk);
}

// --- Set up the User's DID and a registry standing in for a resolver ---

const userKeypair = Secp256r1Keypair.random();
const userDid = 'did:example:user-123';
const didRegistry = new Map([
  [userDid, {
    id: userDid,
    verificationMethod: [
      {
        id: `${userDid}#key-1`,
        type: 'JsonWebKey2020',
        controller: userDid,
        publicKeyJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      },
    ],
  }],
]);

// --- The rest of the flow is unaffected by where userPublicKey came from ---

const agentKeypair = Secp256r1Keypair.random();
const merchant = { id: 'merchant_1', name: 'Demo Merchant', website: 'https://demo-merchant.example' };

const openCheckoutContent = buildOpenCheckoutMandate({
  vct: 'mandate.checkout.open.1',
  constraints: [
    {
      type: 'checkout.line_items',
      items: [{ id: 'line_1', quantity: 1, acceptable_items: [{ id: 'SKU-1', title: 'Widget' }] }],
    },
    { type: 'checkout.allowed_merchants', allowed: [merchant] },
  ],
  cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
});
// Signed by the User's own key -- in a real Trusted Surface / wallet flow,
// this happens on the User's device, tied to the same key their DID resolves to.
const openCheckoutPresentation = await signOpenCheckoutMandate(openCheckoutContent, {
  signer: userKeypair,
});

const checkoutJwt = 'eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig';
const closedCheckoutContent = buildClosedCheckoutMandate({
  vct: 'mandate.checkout.1',
  checkout_jwt: checkoutJwt,
  checkout_hash: computeCheckoutHash(checkoutJwt),
});
const nonce = 'merchant-supplied-nonce-1';
const closedCheckoutPresentation = await signClosedCheckoutMandate(closedCheckoutContent, {
  signer: agentKeypair,
  nonce,
  openMandatePresentation: openCheckoutPresentation,
});

// --- The Merchant/Credential Provider verifies it ---

// In production: the Merchant already knows (from earlier in the flow, e.g.
// an authentication step) which User this checkout belongs to, and resolves
// their DID to get a trusted key -- it does not extract a DID from the
// mandate presentation itself, since nothing in the presentation is trusted
// until after this resolution happens.
const didDocument = await resolveDid(userDid, didRegistry);
const userPublicKey = userPublicKeyFromDidDocument(didDocument);

const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
  openMandatePresentation: openCheckoutPresentation,
  userPublicKey,
  expectedNonce: nonce,
});

if (!result.verified) {
  throw result.error;
}

console.log('Resolved User DID:', userDid);
console.log('Verified Closed Checkout Mandate content:', result.content);
console.log('Open Mandate issuer verified:', result.openMandateIssuerVerified);
