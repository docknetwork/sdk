# @docknetwork/credential-sdk

## 0.13.0

### Minor Changes

- Small refactoring of the `did/document`

## 0.12.0

### Minor Changes

- Allow to pass `wallet` to `CheqdAPI`, misc tweaks

## 0.11.0

### Minor Changes

- Tweaks for `lastPublicKeyId` and `nextPublicKeyId`

## 0.10.0

### Minor Changes

- Allow to use `MultiApiCoreModules` with `CheqdCoreModules`

## 0.9.0

### Minor Changes

- Implement `OffchainSignatures` module for `cheqd`

## 0.8.0

### Minor Changes

- Export CustomLinkedDataSignature

## 0.7.0

### Minor Changes

- JWT fixes

## 0.6.0

### Minor Changes

- Fix remaining exports from the `vc` module

## 0.5.0

### Minor Changes

- Fix exports

## 0.4.0

### Minor Changes

- Implement `MultiApi` modules allowing to use different APIs in the same moment

## 0.3.0

### Minor Changes

- - Updated `DIDDocument`: modified the rules for storing keys in the verificationMethod and added the required validations.
  - Developed generic tests for modules to ensure they cover the same use cases, regardless of the specific implementation.
  - Implemented the `CheqdBlobModule`.
  - Misc tweaks.

## 0.2.0

### Minor Changes

- Change `DIDDocument` modification behaviour to throw error on attempt to add key/service/controller with duplicate id.

## 0.1.1

### Minor Changes

- Improved READMEs
- `WILDCARD` symbol was changed to reflect the new project structure
