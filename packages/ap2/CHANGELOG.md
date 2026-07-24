# @docknetwork/ap2

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
