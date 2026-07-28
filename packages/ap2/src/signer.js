import { Secp256r1Keypair } from '@docknetwork/crypto-utils/keypairs';

/**
 * Generates a fresh signer for issuing AP2 receipts (`issueReceipt`,
 * `issuePaymentReceipt`, `issueCheckoutReceipt`) -- an ES256 (P-256)
 * keypair, the only algorithm those functions currently accept
 * (`signReceipt` throws on any other `alg`). The returned keypair already
 * satisfies their `{sign: function(Uint8Array): *}` signer interface
 * directly, with no extra wrapping needed.
 *
 * This is the quick-start path so a consumer doesn't need
 * `@docknetwork/crypto-utils` as a second direct dependency just to get a
 * signer. For BYOK use cases (a signer backed by an HSM/KMS, or an existing
 * key rather than a freshly-generated one), construct your own
 * `{sign(bytes)}` object instead -- `issueReceipt` et al. never require this
 * specific class, only that shape.
 *
 * @returns {Secp256r1Keypair}
 */
export function generateSigner() {
  return Secp256r1Keypair.random();
}
