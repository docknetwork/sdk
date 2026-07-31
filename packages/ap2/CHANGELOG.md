# @docknetwork/ap2

## 0.5.0

### Minor Changes

- 29dea58: `verifyClosedCheckoutMandate` and `verifyClosedPaymentMandate` now require
  `openMandatePresentation` and always derive the envelope's expected signing
  key from the referenced Open Mandate's own `cnf.jwk`. The `publicKey`/
  `holderJwk` parameters are removed entirely — there is no longer a way to
  verify a Closed Mandate against a caller-supplied key. Previously, a caller
  that verified a signature against a self-supplied key had no guarantee that
  key was ever the one the Open Mandate actually endorsed as its holder — a
  Closed Mandate signed by an unauthorized key would still "verify" as long as
  the caller supplied that same (wrong) key. Since this package has no
  production usage yet, that insecure fallback is removed rather than kept
  for backwards compatibility: calling either function without
  `openMandatePresentation` now returns `{ verified: false, error }` instead
  of silently trusting an unverified key.

  Both functions also now require `userPublicKey` — the User's own key,
  resolved independently by the caller (e.g. via DID resolution or a wallet
  registry) — and verify it against the referenced Open Mandate's own issuer
  signature. Without this, deriving the verification key from `cnf.jwk` only
  proves the Closed Mandate matches whatever the Open Mandate says, not that
  the Open Mandate itself came from a real, authorized User: an attacker could
  previously fabricate an entire Open + Closed Mandate chain naming their own
  key in `cnf.jwk`, and every internal check (digest consistency, envelope
  signature, `sd_hash`) would pass, since they're all self-referential to the
  forged chain. `resolveOpenCheckoutMandateContent`/
  `resolveOpenPaymentMandateContent` gained a matching optional
  `userPublicKey` parameter (returning `issuerVerified: true` when supplied and
  valid) for callers using them directly; omitting it there still only checks
  internal self-consistency, as before.

  Added `resolveOpenCheckoutMandateContent`, mirroring
  `resolveOpenPaymentMandateContent` for Open Checkout Mandates, which the fix
  above uses internally and which callers can also use directly (e.g. to
  enforce checkout constraints or re-verify `cnf.jwk` before closing a mandate,
  the way `issueClosedPaymentMandate`-style flows already do for payments).

  `verifyClosedPaymentMandate` also accepts a new optional
  `openCheckoutMandatePresentation` parameter. When supplied alongside
  `openMandatePresentation`, its issuer signature is verified against the same
  `userPublicKey`, then the Open Payment Mandate's
  `payment.reference.conditional_transaction_id` constraint is checked against
  a fresh `sd_hash` of that Open Checkout Mandate presentation, returning
  `referenceVerified` in the result. This was previously left entirely to the
  caller (see the AP2 spec's Reference constraint) even though the package
  already required both presentations for its other checks.

  Both `verifyClosedCheckoutMandate` and `verifyClosedPaymentMandate` now also
  check the envelope's `typ` claim (`"kb+sd-jwt"`), rejecting an Open Mandate
  presentation (`typ: "dc+sd-jwt"`) or any other envelope type fed in where a
  Closed Mandate is expected. Other checks (schema shape, `aud`,
  `checkout_hash`) would likely catch a swapped-in envelope in practice, but
  this closes the gap explicitly rather than relying on that.

  Both functions also now require `expectedNonce`, checked against the
  envelope's `nonce` claim. Closed Mandate envelopes carry no `exp` of their
  own -- their only expiry comes transitively from the referenced Open
  Mandate, which is typically valid for an entire shopping session -- and
  `nonce` was previously accepted at signing time but never checked at
  verification time, so a validly-signed Closed Mandate presentation could be
  replayed for a different transaction indefinitely. `expectedNonce` should be
  the single-use value the merchant/credential-provider itself generated and
  tracks for this specific transaction.

  Added an example, `examples/verify-mandate-with-did-user-key.mjs` (run via
  `yarn example:did-mandate`), showing how to resolve `userPublicKey` from a
  User's DID document and use it in the verification flow above.

  Documented (README + JSDoc on `buildOpenCheckoutMandate`/
  `buildOpenPaymentMandate`) that AP2 v0.2 defines no Mandate revocation
  mechanism at all -- it's explicitly out of scope per spec -- and that `exp`
  is the only verifier-enforceable lifecycle control, RECOMMENDED but
  schema-optional. No behavior changed; this closes a documentation gap
  identified while reviewing the spec, not a code gap.

## 0.4.2

### Patch Changes

- Updated dependencies [8e97488]
  - @docknetwork/crypto-utils@0.2.3

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
