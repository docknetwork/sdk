---
"@docknetwork/crypto-utils": patch
---

Ship TypeScript declaration files (`.d.ts`) with the package, generated
from the existing JSDoc-annotated source via a `tsc` declaration-only
build step (same approach as `@docknetwork/ap2` and
`@docknetwork/vc-delegation-engine`). Previously the package had no
`types` field and emitted no declarations, so TypeScript consumers got
no type information on import, including through `@docknetwork/ap2`,
which re-exports several `crypto-utils` symbols.
