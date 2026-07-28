# @docknetwork/crypto-utils

## 0.2.3

### Patch Changes

- 8e97488: Ship TypeScript declaration files (`.d.ts`) with the package, generated
  from the existing JSDoc-annotated source via a `tsc` declaration-only
  build step (same approach as `@docknetwork/ap2` and
  `@docknetwork/vc-delegation-engine`). Previously the package had no
  `types` field and emitted no declarations, so TypeScript consumers got
  no type information on import, including through `@docknetwork/ap2`,
  which re-exports several `crypto-utils` symbols.

## 0.2.2

### Patch Changes

- SD-JWT verification

## 0.2.1

### Patch Changes

- AP2 package

## 0.2.0

### Minor Changes

- Create crypto-utils package
