# credential-sdk

## Purpose

API-agnostic core of the Dock SDK: Verifiable Credential/Presentation types, DID types and
resolvers, claim deduction, presentation-exchange (PEX) helpers, and the abstract storage-module
interfaces that chain-specific packages (e.g. `cheqd-blockchain-modules`) implement.

## Entry Point & Stack

- Entry: `src/index.js` via package `exports` (see `package.json` for the ESM/CJS/`src/*` map).
- Check `package.json` for the current version and full dependency list — notably
  `@docknetwork/crypto-utils`, `@docknetwork/crypto-wasm-ts` (WASM crypto), and
  `@docknetwork/vc-delegation-engine`.
- `engines.node` is declared per-package — check `package.json`, do not assume it matches root.

## Non-obvious mechanisms

- Dock's own blockchain is being sunset (see root `README.md`); this package still contains
  Dock-chain types/resolvers under `src/types` and `src/modules` alongside the actively-developed
  Cheqd path — don't assume every module here is still live.
- `jest.config.js` maps `@docknetwork/crypto-utils` straight to that sibling package's `src/`
  (not `dist/`), so editing `crypto-utils` source is picked up by this package's tests without a
  rebuild.
- Tests run under a custom Jest `testEnvironment` (`./tests/test-environment`), not the Jest
  default — needed for the `Uint8Array`/`TextEncoder`/etc. globals this package's WASM crypto
  dependencies expect.

## Local commands

```bash
cd packages/credential-sdk
yarn build                # rollup
yarn test                 # jest --verbose ./tests/*
yarn test-ipfs             # IPFS-specific suite (needs IPFS env)
yarn test-ipfs-with-node   # via ../scripts/with_dock_docker_test_node
yarn test-with-all-nodes   # via ../../scripts/with_all_dock_docker_test_nodes
yarn lint                  # eslint "src/**/*.js"
yarn lint-tests            # eslint "{tests/unit,tests/integration}/**/*.js"
yarn docs                  # jsdoc -> out/reference
```

## Tests

Jest suites live flat under `tests/` (e.g. `tests/claim-deduction.test.js`, `tests/canonicalize.test.js`)
plus a dedicated `tests/ipfs` suite; the `lint-tests` script targets `tests/unit`/`tests/integration`
paths that don't currently exist in this package, so that script is a no-op today. CI
(`.github/workflows/credential-sdk-tests.yml`) only runs the default `test` script — the
Dock-node-backed `test-with-all-nodes` and `test-ipfs` scripts are not wired into any workflow, so
treat them as locally-run/manual coverage.

## See also

[Root AGENTS.md](../../AGENTS.md)
