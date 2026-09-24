# vc-delegation-engine

## Purpose

Evaluates delegated-credential chains inside Verifiable Presentations, extracts authorized claims
via claim deduction, and feeds the resulting facts into Cedar policy decisions.

## Entry Point & Stack

- Entry: `src/index.js` (see `package.json` for the built `main`/`module`/`types` paths).
- License is declared as `ISC` in this package's `package.json`, unlike the repo-wide MIT
  `LICENSE.md` — flag this if you touch licensing here.
- Check `package.json` for the current version. No internal `@docknetwork/*` dependencies; peer-depends
  on `@cedar-policy/cedar-wasm` (`^4.5.0` — check `package.json`).

## Non-obvious mechanisms

- Built with `esbuild` (not Rollup, unlike every other package here) directly against
  `src/index.js`, bundling everything except a fixed external list (`@cedar-policy/cedar-wasm/nodejs`,
  `ajv`, `ajv-formats`, `json-canonicalize`, `jsonld`, `rify`) — see the `build:esm`/`build:cjs`
  scripts in `package.json` before assuming Rollup config applies.
- This is the only package using **Vitest** instead of Jest (`vitest.config.js`); it targets
  `tests/**/*.test.js` and enables `v8` coverage reporting, but no threshold is enforced.
- `docs-disabled` script name signals jsdoc generation is intentionally turned off for this
  package — don't re-enable it without checking why it was disabled.

## Local commands

```bash
cd packages/vc-delegation-engine
yarn build        # clean -> esbuild ESM + CJS -> tsc types
yarn test          # vitest run --coverage ./tests
yarn examples      # runs the example scripts under examples/ against real fixtures
yarn lint
```

## Tests

Vitest suites under `tests/unit` and `tests/integration`, plus `tests/examples.test.js` and
`tests/fixtures`. CI runs the default `test` script (`.github/workflows/vc-delegation-engine-tests.yml`)
and, separately, the `examples` script as its own smoke-test workflow
(`.github/workflows/vc-delegation-engine-examples.yml`).

## See also

[Root AGENTS.md](../../AGENTS.md)
