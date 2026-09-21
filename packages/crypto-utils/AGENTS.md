# crypto-utils

## Purpose

Lightweight, dependency-minimal Dock keypair, crypto-value-type, byte-utility, and JWS/SD-JWT
helper library. The only package in this repo with no internal (`@docknetwork/*`) dependencies —
`credential-sdk`, `ap2`, and others build on top of it.

## Entry Point & Stack

- Entry: `src/index.js`, with typed subpath exports (`./key-utils`, `./keypairs`, `./types`,
  `./utils`, `./vc`) — see `package.json` `exports` for the full map, each backed by its own
  `dist/types/*.d.ts`.
- Check `package.json` for the current version.

## Local commands

```bash
cd packages/crypto-utils
yarn build          # build:js (rollup) + build:types (tsc -p tsconfig.build.json)
yarn test            # jest --runInBand
yarn lint
```

## Tests

Jest suites under `tests/` (`crypto-utils.test.js`, `sd-jwt.test.js`). No `test-with-node` variant —
this package has no blockchain dependency, so CI (`.github/workflows/crypto-utils-tests.yml`) just
runs `turbo run build test --filter @docknetwork/crypto-utils`.

## See also

[Root AGENTS.md](../../AGENTS.md)
