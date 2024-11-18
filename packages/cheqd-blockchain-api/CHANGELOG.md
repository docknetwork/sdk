# @docknetwork/cheqd-blockchain-api

## 0.6.0

### Minor Changes

- Fix `prepublish` for `cheqd-blockchain-api`

## 0.5.0

### Minor Changes

- Implement `OffchainSignatures` module for `cheqd`

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.9.0

## 0.4.0

### Minor Changes

- Fix exports

## 0.3.0

### Minor Changes

- Implement `MultiApi` modules allowing to use different APIs in the same moment

## 0.2.0

### Minor Changes

- - Updated `DIDDocument`: modified the rules for storing keys in the verificationMethod and added the required validations.
  - Developed generic tests for modules to ensure they cover the same use cases, regardless of the specific implementation.
  - Implemented the `CheqdBlobModule`.
  - Misc tweaks.

## 0.1.2

### Patch Changes

- Change `DIDDocument` modification behaviour to throw error on attempt to add key/service/controller with duplicate id.

## 0.1.1

### Minor Changes

- Improved READMEs
