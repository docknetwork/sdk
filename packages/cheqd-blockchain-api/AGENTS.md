# cheqd-blockchain-api

## Purpose

Thin client library atop `@cheqd/sdk` for connecting to and transacting on the Cheqd blockchain
(DIDs, resources, wallet management, batched/multi-sender transactions).

## Entry Point & Stack

- Entry: `src/index.js` via package `exports` (see `package.json` for the full map, `api`/`wallet`/
  `multi-sender`/`utils` submodule exports).
- Check `package.json` for the current version. `@docknetwork/credential-sdk` is a **peer
  dependency** (currently `^0.57.0` — check `package.json`), so consumers must install a compatible
  `credential-sdk` alongside this package.

## Non-obvious mechanisms

- `jest.config.js` maps `@docknetwork/credential-sdk/*` to `credential-sdk`'s **built** `dist/esm`
  output, not its `src/` — you must `yarn build` in `packages/credential-sdk` (or rely on Turbo's
  `^build` dependency) before this package's tests see credential-sdk changes.
- Real-node tests (`test-with-node`) start a Cheqd node via
  `../../scripts/with_cheqd_docker_test_node` and require `CHEQD_MNEMONIC`, `CHEQD_IMAGE_TAG`,
  `CHEQD_NETWORK` env vars — CI runs this against both `testnet` and `mainnet` network configs
  (`.github/workflows/cheqd-api-tests.yml`).

## Local commands

```bash
cd packages/cheqd-blockchain-api
yarn build        # rollup
yarn watch         # rollup -c -w
yarn test          # jest (mocked/offline)
yarn test-with-node        # needs CHEQD_MNEMONIC/CHEQD_IMAGE_TAG/CHEQD_NETWORK + docker
yarn type-check     # tsc --allowJs --checkJs --noEmit ...
yarn lint
yarn docs          # jsdoc -> out/reference
```

## Tests

Jest suites under `tests/` (e.g. `tests/api-init.test.js`, `tests/multi-sender.test.js`) plus shared
`tests/constants.js` and a custom `tests/test-environment.js`. Turbo's `test` task runs the offline
suite (no cache since `turbo.json` marks `test` as `cache: false`); the node-backed suite only runs
via the dedicated `test-with-node` task/workflow.

## See also

[Root AGENTS.md](../../AGENTS.md)
