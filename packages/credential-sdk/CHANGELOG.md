# @docknetwork/credential-sdk

## 0.24.0

### Minor Changes

- Align with the latest `cheqd` node version (`3.1.3`)

## 0.23.0

- ld.dock.io -> ld.truvera.io

## 0.22.0

### Minor Changes

- Implementation of the `cheqd` migration and the associated identifier mappers.

## 0.21.0

### Minor Changes

- Serialization/deserialization tweaks for `cheqd`

## 0.20.0

### Minor Changes

- Fix schema validation with ID only when ID isnt required

## 0.19.0

### Minor Changes

- Fix unresolved imports

## 0.18.0

### Minor Changes

- `Accumulator` module for `cheqd`

## 0.17.0

### Minor Changes

- Fix `toJSON`/`fromJSON` for `cheqd` payloads

## 0.16.0

### Minor Changes

- Dont require credential subject property

## 0.15.0

### Minor Changes

- Modify the `SDK` to be compatible with the most recent `cheqd` node.

## 0.14.0

### Minor Changes

- `StatusListCredential` module for `cheqd`, misc tweaks

## 0.13.0

### Minor Changes

- Small refactoring of the `did/document`
- Audit fixes and RDF lib upgrade

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
