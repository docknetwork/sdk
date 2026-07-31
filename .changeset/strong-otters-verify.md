---
"@docknetwork/ap2": minor
---

`verifyClosedCheckoutMandate` and `verifyClosedPaymentMandate` now require
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
