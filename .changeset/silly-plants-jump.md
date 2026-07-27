---
"@docknetwork/ap2": minor
---

Add `generateSigner()`, a quick-start way to get an `issueReceipt`-compatible
signer (a fresh ES256 keypair) without adding `@docknetwork/crypto-utils` as
a second direct dependency. Also re-export `Secp256r1Keypair` from the
package root for consumers who need more control (e.g. `fromSeed` for
deterministic tests).

`issueReceipt`/`issuePaymentReceipt`/`issueCheckoutReceipt` never required
this specific class -- they accept any `{sign: function(Uint8Array)}`
signer (see the existing BYOK-signer test), which still works unchanged for
consumers bringing their own HSM/KMS-backed signer.
