# @docknetwork/vc-delegation-engine

A focused Javascript engine for evaluating delegated credentials in Verifiable Presentations, extracting authorized claims, and piping the resulting facts into Cedar policy decisions.

## Features

- **Delegation-Aware VP Verification**: `verifyVPWithDelegation` walks each credential chain inside an expanded VP, reconstructs the delegation graph, and ensures every link is present, acyclic, and properly referenced before issuing a decision.

- **Claim Deduction & Summaries**: Built-in summarizers and deduction utilities capture root/tail issuers, resource metadata, and the union of authorized claims so relying parties can inspect what a chain actually grants.

- **Cedar Policy Integration**: Helper APIs build ready-to-run [Cedar](https://www.cedarpolicy.com/) authorization requests (entities, context, and policies) and execute them through `@cedar-policy/cedar-wasm`, letting you layer fine-grained policy checks on top of delegation results.

- **JSON-LD & Rify Utilities**: Normalization helpers, JSON-LD compaction, and [Rify](https://www.npmjs.com/package/rify) premises/rules generation simplify interoperating with linked data credentials and inference engines.

- **Robust Failure Diagnostics**: Typed `DelegationError` codes, unauthorized-claim detection, and summarized evaluation objects make it easier to surface meaningful errors to clients and observability pipelines.

## Installation

You can install the `@docknetwork/vc-delegation-engine` via npm:

```bash
npm install @docknetwork/vc-delegation-engine
```

Or via yarn:

```bash
yarn add @docknetwork/vc-delegation-engine
```

## Core Modules

- **`verifyVPWithDelegation`**: Normalizes JSON-LD credentials from a VP, rebuilds each delegation chain, runs Rify inference to verify control predicates, and returns allow/deny decisions with rich evaluation artifacts.

- **Cedar Authorization Helpers**: `buildCedarContext`, `buildAuthorizationInputsFromEvaluation`, and `authorizeEvaluationsWithCedar` assemble Cedar entities, context data (root/tail issuers, authorized claims, tail depth, signer), and execute `cedar.isAuthorized` for policy enforcement.

- **Claim Deduction (`claim-deduction.js`)**: Aggregates authorized subject claims, maps them back to credential subjects, and exposes both per-subject and union views for downstream policy checks or display.

- **JSON-LD & Rify Helpers (`jsonld-utils.js`, `rify-helpers.js`)**: Provide compaction/context normalization, verification method extraction, and automatic rule/premise construction required to run `rify` inference consistently.

- **Errors, Summaries, and Constants**: `DelegationError`/`DelegationErrorCodes` offer structured failures, while `summarize.js` and `constants.js` capture reusable IRIs, action IDs, and summary builders for every delegation evaluation.

## Delegation Architecture Notes

The engine behavior includes several decisions that are important for integrators but easy to miss when reading only API signatures:

- **Fail-closed verification**: any structural, policy, digest, or inference failure yields a `deny` decision with typed failure codes.
- **Tail-first chain reconstruction**: chains are built from each tail credential by following `previousCredentialId`, and they reject cycles and missing links.
- **Strict root anchoring**: delegation credentials must carry `rootCredentialId`; the root must be present in the same presentation bundle.
- **Policy integrity binding**: when policy checks are enabled and a root references `delegationPolicyId`/`delegationPolicyDigest`, a `documentLoader` must fetch the policy and the digest must match.
- **Monotonic narrowing model**: child credentials are validated as same-or-narrower than parent grants (roles, capabilities, and expiration windows).
- **Signer-as-principal model**: the VP proof signer is surfaced as principal/context input for Cedar decisions.
- **Dual-path VC-JWT ingestion**: JSON-LD VC-JWTs are expanded and evaluated as chains; VC-JWTs without JSON-LD context are intentionally skipped from chain logic but exposed as `skippedCredentials` for policy use.

For a fuller record, see the consolidated delegation reference: [`DELEGATION_REFERENCE.md`](./DELEGATION_REFERENCE.md).

## Working Material (Non-normative)

Some delegation material is intentionally preserved as working references rather than normative docs:

- scenario-heavy examples that encode practical policy patterns
- test fixtures that capture edge cases and expected failures
- policy JSON fixtures that act as reference schemas for role/capability narrowing

See [`DELEGATION_REFERENCE.md`](./DELEGATION_REFERENCE.md) for the curated index and contributor checklist.

## License

This SDK is licensed under the MIT License. See the [LICENSE.md](../../LICENSE.md) file for more details.

