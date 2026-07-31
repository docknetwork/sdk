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

Added `resolveOpenCheckoutMandateContent`, mirroring
`resolveOpenPaymentMandateContent` for Open Checkout Mandates, which the fix
above uses internally and which callers can also use directly (e.g. to
enforce checkout constraints or re-verify `cnf.jwk` before closing a mandate,
the way `issueClosedPaymentMandate`-style flows already do for payments).

`verifyClosedPaymentMandate` also accepts a new optional
`openCheckoutMandatePresentation` parameter. When supplied alongside
`openMandatePresentation`, it verifies the Open Payment Mandate's
`payment.reference.conditional_transaction_id` constraint against a fresh
`sd_hash` of that Open Checkout Mandate presentation, returning
`referenceVerified` in the result. This was previously left entirely to the
caller (see the AP2 spec's Reference constraint) even though the package
already required both presentations for its other checks.
