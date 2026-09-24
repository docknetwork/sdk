# cheqd-blockchain-modules

## Purpose

Cheqd-specific implementations of `credential-sdk`'s abstract storage modules: DID, accumulator,
attest, blob, offchain-signatures, and status-list-credential, all backed by
`cheqd-blockchain-api`.

## Entry Point & Stack

- Entry: `src/index.js` via package `exports` (see `package.json`; per-module subpath exports like
  `./did`, `./accumulator` resolve to `dist/esm/<module>/index.js`).
- Check `package.json` for the current version. Depends on `@docknetwork/cheqd-blockchain-api`
  (pinned exact version in `devDependencies`) and peer-depends on `@docknetwork/credential-sdk`
  (`^0.57.0` — check `package.json`); keep these two in step when bumping either.

## Non-obvious mechanisms

- `jest.config.js` maps both `@docknetwork/credential-sdk/*` and `@docknetwork/cheqd-blockchain-api`
  to their sibling packages' **built** `dist/esm` output — run/rely on Turbo's `^build` before
  testing here, editing their `src/` alone will not be picked up.
- `dev-node` script runs a local Cheqd dev node via `../../scripts/run_cheqd_node_in_docker --dev
  --rpc-external --ws-external --rpc-cors=all` for manual/interactive testing.
- CI's node-backed job retries the test run up to 3 times with a 60s backoff
  (`.github/workflows/cheqd-modules-tests.yml`) to absorb transient testnet flakiness — a single
  local failure is not necessarily a real regression.

## Local commands

```bash
cd packages/cheqd-blockchain-modules
yarn build
yarn test               # jest (mocked/offline)
yarn test-with-node      # needs CHEQD_MNEMONIC/CHEQD_IMAGE_TAG/CHEQD_NETWORK + docker
yarn dev-node            # local Cheqd dev node in docker
yarn lint
yarn docs
```

## Tests

Jest suites under `tests/`, one file per module (`accumulator-module.test.js`, `attest-module.test.js`,
`blob-module.test.js`, `did-module.test.js`, plus a shared `tests/common.js`). As with
`cheqd-blockchain-api`, the offline `test` task and the node-backed `test-with-node` task/workflow are
separate — CI runs the latter against both `testnet` and `mainnet`.

## See also

[Root AGENTS.md](../../AGENTS.md)
