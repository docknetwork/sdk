# @docknetwork/ap2

[AP2](https://ap2-protocol.org/) receipt issuance and verification using the
lightweight Dock crypto utilities. Receipts are compact ES256 JWTs compatible
with the AP2 receipt format.

See the [AP2 documentation](https://ap2-protocol.org/) and
[specification](https://ap2-protocol.org/ap2/specification/) for protocol
details.

```js
import {
  buildPaymentReceipt,
  computeMandateReference,
  signReceipt,
  verifyPaymentReceipt,
} from '@docknetwork/ap2';
import { Secp256r1Keypair } from '@docknetwork/crypto-utils/keypairs';

const keypair = Secp256r1Keypair.random();
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
const result = verifyPaymentReceipt(jwt, {
  publicKey: keypair.publicKey(),
  expectedIssuer: 'mpp.acme',
  mandatePresentation: closedMandatePresentation,
  maxReceiptAge: 300,
});

if (!result.verified) {
  throw result.error;
}
```

Checkout receipts use `issueCheckoutReceipt` and `verifyCheckoutReceipt`.
The generic `issueReceipt` and `verifyReceipt` functions remain available for
the Dock keypair flow.
Verification returns `{ verified, receipt, protectedHeader }` on success and
`{ verified: false, error }` on failure, following the credential SDK result
style.

## Payloads and signing

`buildCheckoutReceipt` and `buildPaymentReceipt` validate against the packaged
AP2 JSON Schemas, clone the payload, and preserve extension properties.

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

This reference check does not verify the mandate itself. Callers using a
mandate/receipt bundle as dispute evidence must separately verify the mandate
signatures, disclosure digests, key binding, delegation, audience, nonce,
dates, constraints, `checkout_hash`, and payment transaction linkage.

## Example

Run the complete payment receipt issue-and-verify example:

```bash
yarn example:receipt
```

See [`examples/issue-and-verify-receipt.mjs`](examples/issue-and-verify-receipt.mjs).
