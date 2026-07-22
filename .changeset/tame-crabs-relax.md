---
"@docknetwork/ap2": minor
---

Add AP2 v0.2 mandate support: build/sign/verify functions for Open and
Closed Checkout Mandates and Payment Mandates
(`buildOpenCheckoutMandate`, `signOpenCheckoutMandate`,
`buildClosedCheckoutMandate`, `signClosedCheckoutMandate`,
`verifyClosedCheckoutMandate`, `buildOpenPaymentMandate`,
`signOpenPaymentMandate`, `buildClosedPaymentMandate`,
`signClosedPaymentMandate`, `verifyClosedPaymentMandate`,
`computeCheckoutHash`, `computeDisclosureDigest`). Mandate verification now
lives in this package instead of requiring an external dependency.
