---
"@docknetwork/ap2": patch
---

`verifyClosedPaymentMandate`'s `openCheckoutMandatePresentation` handling now
fully resolves that presentation (schema validation and its own `exp` check,
in addition to the issuer signature check it already did) before using it to
compute `referenceVerified`. Previously it only checked the raw envelope
signature, so an expired or otherwise schema-invalid Open Checkout Mandate
presentation could still produce `referenceVerified: true` — the exact class
of gap this package has been closing elsewhere (verification that exists at
one layer but isn't enforced end-to-end). An invalid `openCheckoutMandatePresentation`
now fails the whole `verifyClosedPaymentMandate` call rather than silently
computing a reference match from it.
