# Delegation Reference

Reference notes for `@docknetwork/vc-delegation-engine`, based on current implementation and tests.

## Processing Model

`verifyVPWithDelegation` runs in this order:

1. Parse the expanded VP and extract signer (`proof.verificationMethod`).
2. Ingest `verifiableCredential` entries:
   - Expanded JSON-LD credentials are compacted using `credentialContexts`.
   - VC-JWT with JSON-LD context is expanded and treated the same way.
   - VC-JWT without JSON-LD context is skipped from chain logic and returned in `skippedCredentials`.
3. Validate delegation references:
   - `previousCredentialId` must resolve if present.
   - Any `DelegationCredential` must include a valid `rootCredentialId`.
4. Build chains tail-first (`previousCredentialId` links), reject cycles, then evaluate each chain.
5. Optionally resolve and verify delegation policy (id + digest + semantic checks).
6. Run Rify inference, derive authorized claims, and build Cedar-ready `facts`/`entities`.
7. Return `allow` on success, `deny` with typed failure codes on error.

## Behavioral Guarantees

- Fail-closed: errors become `decision: "deny"` with stable `DelegationErrorCodes`.
- Credential array order is not trusted; chains are reconstructed from references.
- Root and previous references are bundle-contained (no implicit external chain lookup).
- Policy checks are digest-bound (`delegationPolicyDigest` must match fetched document hash).
- Policy chain checks enforce:
  - role ancestry (and optional `cannotDelegateToSameRole`),
  - max delegation depth,
  - parent/child expiration ordering,
  - capability/claim monotonic narrowing.
- Unauthorized claims can be made fatal with `failOnUnauthorizedClaims: true`.
- Parent claim hierarchy is exposed as nested `parentClaims` in evaluation outputs.
- Presentations without delegation links are still supported and evaluated.

## Practical References

### Examples

- `examples/simple-delegation.js` - minimal allow/deny delegation flow.
- `examples/delegation-chain.js` - multi-hop credit-score delegation.
- `examples/multi-delegation-vp.js` - one VP containing multiple tails/chains.
- `examples/pharmacy.js` - role/capability policy scenario using pharmacy fixtures.
- `examples/document-loader.js` - JSON-LD loader with policy-document resolution.

### Fixtures

- `tests/fixtures/delegation-pharmacy-policy.json`
- `tests/fixtures/policy-integration-pharmacy.json`
- `tests/fixtures/policy-integration-travel.json`
- `tests/fixtures/simpleDelegation.js`
- `tests/fixtures/multiDelegation.js`
- `tests/fixtures/staff.js`
- `tests/fixtures/pharmacy.js`
- `tests/fixtures/nonDelegated.js`

### High-signal tests

- `tests/unit/engine.test.js` - chain reconstruction, reference errors, parentClaims shaping.
- `tests/unit/delegation-policy.test.js` - digest, semantics, roles, lifetime, and narrowing checks.
- `tests/unit/jwt-engine.test.js` - JSON-LD vs non-JSON-LD VC-JWT handling and skip behavior.
- `tests/examples.test.js` - fixture-backed end-to-end behavior.

## Change Checklist

When delegation behavior changes:

- update this file in the same PR,
- update/add examples for new patterns,
- update fixtures for new chain shapes,
- add tests for both allow and deny paths.
