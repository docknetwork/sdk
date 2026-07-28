# @docknetwork/ap2

## 0.4.1

### Patch Changes

- 79cad1f: Ship TypeScript declaration files (`.d.ts`) with the package. Previously
  `@docknetwork/ap2` had no `types` field and emitted no declarations, so
  TypeScript consumers got no type information on import. Declarations are
  now generated from the existing JSDoc-annotated source via a `tsc`
  declaration-only build step, mirroring the approach already used in
  `@docknetwork/vc-delegation-engine`.

## 0.4.0

### Minor Changes

- 53c6f47: Add `generateSigner()`, a quick-start way to get an `issueReceipt`-compatible
  signer (a fresh ES256 keypair) without adding `@docknetwork/crypto-utils` as
  a second direct dependency. Also re-export `Secp256r1Keypair` from the
  package root for consumers who need more control (e.g. `fromSeed` for
  deterministic tests).

  `issueReceipt`/`issuePaymentReceipt`/`issueCheckoutReceipt` never required
  this specific class -- they accept any `{sign: function(Uint8Array)}`
  signer (see the existing BYOK-signer test), which still works unchanged for
  consumers bringing their own HSM/KMS-backed signer.

- 53c6f47: Re-export `parseSdJwtPresentation` from `@docknetwork/crypto-utils/vc` at
  the package root, alongside the existing `computeSdHash` re-export.
  `mandates.js` already depends on it internally to decode Open/Closed
  mandate presentations; consumers doing the same (e.g. to inspect a
  presentation's disclosed claims) previously had to add
  `@docknetwork/crypto-utils` as a second direct dependency just for this
  one function.

## 0.3.0

### Minor Changes

- 61e1eb5: Add AP2 v0.2 mandate support: build/sign/verify functions for Open and
  Closed Checkout Mandates and Payment Mandates
  (`buildOpenCheckoutMandate`, `signOpenCheckoutMandate`,
  `buildClosedCheckoutMandate`, `signClosedCheckoutMandate`,
  `verifyClosedCheckoutMandate`, `buildOpenPaymentMandate`,
  `signOpenPaymentMandate`, `buildClosedPaymentMandate`,
  `signClosedPaymentMandate`, `verifyClosedPaymentMandate`,
  `computeCheckoutHash`, `computeDisclosureDigest`). Mandate verification now
  lives in this package instead of requiring an external dependency.

  The four mandate JSON Schemas (`src/schemas/{checkout,payment}-mandate-
{open,closed}.json`) are now generated from a pinned upstream AP2 mirror
  (`upstream-ap2-schemas/`) via `npm run generate-schemas`, rather than
  hand-maintained. All six packaged JSON Schemas (the four mandate schemas
  plus the existing checkout/payment receipt schemas) are now exported as
  named exports (`checkoutMandateOpenSchema`, `checkoutMandateClosedSchema`,
  `paymentMandateOpenSchema`, `paymentMandateClosedSchema`,
  `checkoutReceiptSchema`, `paymentReceiptSchema`) for consumers that need
  the raw schema content.

## 0.2.2

### Patch Changes

- Updated dependencies
  - @docknetwork/crypto-utils@0.2.2

## 0.2.1

### Patch Changes

- AP2 package
- Updated dependencies
  - @docknetwork/crypto-utils@0.2.1
