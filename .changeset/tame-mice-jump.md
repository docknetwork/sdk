---
"@docknetwork/ap2": patch
---

Ship TypeScript declaration files (`.d.ts`) with the package. Previously
`@docknetwork/ap2` had no `types` field and emitted no declarations, so
TypeScript consumers got no type information on import. Declarations are
now generated from the existing JSDoc-annotated source via a `tsc`
declaration-only build step, mirroring the approach already used in
`@docknetwork/vc-delegation-engine`.
