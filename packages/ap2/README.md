# @docknetwork/ap2

[AP2](https://ap2-protocol.org/) mandate and receipt issuance/verification
using the lightweight Dock crypto utilities. Mandates and receipts are
compact ES256 SD-JWTs/JWTs compatible with the AP2 v0.2 spec.

See the [AP2 documentation](https://ap2-protocol.org/) and
[specification](https://ap2-protocol.org/ap2/specification/) for protocol
details.

```js
import {
  buildPaymentReceipt,
  computeMandateReference,
  generateSigner,
  signReceipt,
  verifyPaymentReceipt,
  verifyClosedPaymentMandate,
} from '@docknetwork/ap2';

const keypair = generateSigner();
// Use the exact compact presentation received from the Shopping Agent.
const closedMandatePresentation = receivedClosedMandatePresentation;
const receipt = buildPaymentReceipt({
  status: 'Success',
  iss: 'mpp.acme',
  iat: Math.floor(Date.now() / 1000),
  reference: computeMandateReference(closedMandatePresentation),
  payment_id: 'PAY-001',
});

const jwt = await signReceipt(receipt, {
  signer: keypair,
  type: 'payment',
});
// Verify the mandate first (signature, cnf key-binding, checkout binding, aud, expiry).
// openMandatePresentation is required -- it's how the trusted verification
// key is derived from the Open Mandate's own cnf.jwk, rather than trusted
// from a caller-supplied key.
const mandateVerification = verifyClosedPaymentMandate(
  closedMandatePresentation,
  { openMandatePresentation, checkoutJwt, openCheckoutMandatePresentation },
);

const result = verifyPaymentReceipt(jwt, {
  publicKey: keypair.publicKey(),
  expectedIssuer: 'mpp.acme',
  mandatePresentation: closedMandatePresentation,
  // Compose mandate verification into the receipt check so a bare reference
  // hash match cannot be mistaken for a fully verified mandate/receipt bundle.
  mandateVerification,
  maxReceiptAge: 300,
});

if (!result.verified) {
  throw result.error;
}
```

Checkout receipts use `issueCheckoutReceipt` and `verifyCheckoutReceipt`.
The generic `issueReceipt` and `verifyReceipt` functions remain available for
the Dock keypair flow.
`generateSigner()` is a quick-start convenience -- a fresh ES256 keypair, the
only algorithm these receipt functions currently accept. `signer` is really
just `{sign: function(Uint8Array): *}`, so bringing your own signer (an
HSM/KMS-backed one, or an existing key via `Secp256r1Keypair.fromSeed`/
`fromPrivateKey`, both re-exported from this package) works the same way --
`generateSigner()` isn't required.
Verification returns `{ verified, receipt, protectedHeader }` on success and
`{ verified: false, error }` on failure, following the credential SDK result
style. Successful results may also include `referenceVerified` and
`mandateVerified` when those checks were requested.

## Payloads and signing

`buildCheckoutReceipt` and `buildPaymentReceipt` validate against the packaged
AP2 JSON Schemas, clone the payload, and preserve extension properties. These
schemas are also available as named exports (`checkoutReceiptSchema`,
`paymentReceiptSchema`) for consumers that want the raw JSON Schema — e.g. for
form generation or documentation — without re-validating through this
package.

`signReceipt` is the BYOK entry point. Its `signer.sign(data)` function may be
synchronous or asynchronous and must return an ES256 signature in 64-byte JOSE
`r || s` form, or Dock's 65-byte form with a recovery byte:

```js
const jwt = await signReceipt(receipt, {
  type: 'payment',
  kid: 'processor-key-1',
  signer: {
    async sign(data) {
      return kms.signEs256(data);
    },
  },
});
```

`computeSdHash({ issuerJwt, disclosures })` is the shared RFC 9901 primitive.
`computeMandateReference(presentation)` parses an AP2 presentation or chain,
selects its final SD-JWT, removes a trailing key-binding JWT, and delegates to
that primitive. `encodeDisclosure([salt, claimName, value])` creates the
base64url-encoded disclosure form used by both functions.

## Mandates

AP2 v0.2 defines two mandate families — **Checkout Mandate** and **Payment
Mandate** — each with an **Open** and **Closed** state. Mandates are
self-signed SD-JWTs: Open Mandates are signed by the user's key (via a
Trusted Surface, e.g. a wallet), Closed Mandates by the Shopping Agent's key
endorsed in the Open Mandate's `cnf` claim. This package builds, signs, and
verifies all four shapes:

```js
import {
  buildOpenCheckoutMandate,
  signOpenCheckoutMandate,
  buildClosedCheckoutMandate,
  signClosedCheckoutMandate,
  verifyClosedCheckoutMandate,
  buildOpenPaymentMandate,
  signOpenPaymentMandate,
  buildClosedPaymentMandate,
  signClosedPaymentMandate,
  verifyClosedPaymentMandate,
  computeCheckoutHash,
} from '@docknetwork/ap2';

// 1. User's wallet signs an Open Checkout Mandate (once, up front).
const openCheckoutContent = buildOpenCheckoutMandate({
  vct: 'mandate.checkout.open.1',
  constraints: [/* checkout.line_items, checkout.allowed_merchants */],
  cnf: { jwk: agentPublicJwk },
});
const openCheckoutPresentation = await signOpenCheckoutMandate(openCheckoutContent, {
  signer: userSigner,
});

// 2. Later, the Shopping Agent closes it against a specific merchant checkout.
const closedCheckoutContent = buildClosedCheckoutMandate({
  vct: 'mandate.checkout.1',
  checkout_jwt: merchantSignedCheckoutJwt,
  checkout_hash: computeCheckoutHash(merchantSignedCheckoutJwt),
});
const closedCheckoutPresentation = await signClosedCheckoutMandate(closedCheckoutContent, {
  signer: agentSigner,
  nonce: 'merchant-supplied-nonce',
  openMandatePresentation: openCheckoutPresentation,
});

// 3. The Merchant/Credential Provider verifies it. The verification key is
// always derived from the Open Mandate's own cnf.jwk -- there is no
// caller-supplied-key option, since a caller-supplied key that happens to
// verify a signature proves nothing about *whose* key it was authorized to be.
const result = verifyClosedCheckoutMandate(closedCheckoutPresentation, {
  openMandatePresentation: openCheckoutPresentation,
});
if (!result.verified) throw result.error;
```

Payment Mandates follow the same `build*`/`sign*`/`verifyClosedPaymentMandate`
pattern, binding to a Checkout Mandate via `transaction_id` (a hash of
`checkout_jwt`, verified against a `checkoutJwt` passed to
`verifyClosedPaymentMandate`).

`build*` validates content against this package's JSON Schemas
(`src/schemas/*.json`), generated from the real upstream AP2 source
(`upstream-ap2-schemas/`, a pinned mirror of
[google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2))
via `npm run generate-schemas` — re-run that script and rebuild after
re-vendoring a newer upstream tag; don't hand-edit `src/schemas/*.json`
directly. Two constraints are schema-required, not just conventional: an Open
Checkout Mandate's
`constraints` must contain at least one `checkout.line_items` entry, and an
Open Payment Mandate's `constraints` must contain a `payment.reference` entry
(with a `conditional_transaction_id` — see the Open Payment Mandate schema
for the full set of supported constraint types, including
`payment.allowed_payees`, `payment.allowed_payment_instruments`,
`payment.allowed_pisps`, `payment.amount_range`, `payment.budget`,
`payment.agent_recurrence`, and `payment.execution_date`).

The `signer` for both signing functions uses the same BYOK
`signer.sign(data)` contract as `signReceipt` — bridge it to a wallet-held key
without ever exposing the private key to this package.

**Known caveat:** `sd_hash` (the claim binding a Closed Mandate back to its
Open Mandate) is implemented here as the RFC 9901 hash of the referenced Open
Mandate's full presentation (`computeSdHash`), matching the Agent
Authorization Framework's "Mandate Receipt... calculated in the same manner
as sd_hash" language. The AP2 spec's own worked example for the Closed
Checkout Mandate shows an `sd_hash` value that instead numerically matches
the digest of its own `checkout_jwt` disclosure — this looks like a reused
placeholder string in the docs rather than a deliberate alternate meaning
(the same string implausibly also appears as an unrelated
`conditional_transaction_id` example elsewhere), but it has not been
confirmed against a reference implementation or the normative "Delegate
SD-JWT" individual draft this spec depends on for chain verification.

## Verification guarantees

Receipt verification:

- accepts only ES256 compact JWTs with `typ: JWT`;
- requires `expectedIssuer`, binding the caller-supplied trusted public key to
  the signed `iss` claim;
- validates integer `iat` against `currentDate` (default: now),
  `clockTolerance` (default: 30 seconds), and optional `maxReceiptAge`;
- enforces the concrete checkout/payment schema and its status-dependent
  fields.

When `mandatePresentation` is supplied, verification also computes the receipt
reference over the exact final SD-JWT presentation. The input is the
issuer-signed JWT and selected disclosures with their original tilde framing.
A trailing key-binding JWT is excluded, `_sd_alg` selects SHA-256, SHA-384, or
SHA-512, and SHA-256 is used when `_sd_alg` is absent. Successful results then
include `referenceVerified: true`.

That reference check does **not** verify the mandate itself. Pass
`mandateVerification` to compose a prior mandate-verification result (or a
synchronous callback that returns one) into `verifyReceipt` /
`verifyPaymentReceipt` / `verifyCheckoutReceipt`. Accepted shapes are
Dock-style `{ verified: true }` and `@ar-agents/ap2`-style `{ ok: true }`. On
success the receipt result includes `mandateVerified: true`; on failure the
mandate error/`reason` is returned as `{ verified: false, error }`.

For dispute evidence, mandate verification should cover signatures, disclosure
digests, key binding, delegation, audience, nonce, dates, constraints,
`checkout_hash`, and payment transaction linkage — then pass that result as
`mandateVerification` alongside `mandatePresentation`.

## Example

Run the complete payment receipt issue-and-verify example:

```bash
yarn example:receipt
```

See [`examples/issue-and-verify-receipt.mjs`](examples/issue-and-verify-receipt.mjs).
