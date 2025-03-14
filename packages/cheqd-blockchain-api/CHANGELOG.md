# @docknetwork/cheqd-blockchain-api

## 1.0.0

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.50.0

## 0.35.0

### Minor Changes

- Remove obsolete dependencies and packages

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.49.0

## 0.34.0

### Minor Changes

- Tweaks for transaction sending flow

## 0.32.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.47.0

## 0.32.0

### Minor Changes

- Introduce `CheqdMultiSenderAPI` + small refactoring

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.47.0

## 0.31.0

### Minor Changes

- Switch `cheqd/sdk` to the latest version, add tests for stringified `CheqdDid` identifier

## 0.30.2

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.44.0

## 0.30.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.43.0

## 0.30.0

### Minor Changes

- Bump up all packages

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.42.0

## 0.29.3

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.40.0

## 0.29.2

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.39.0

## 0.29.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.38.0

## 0.29.0

### Minor Changes

- Improvements and simplifications

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.37.0

## 0.29.0

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.36.0

## 0.28.0

### Minor Changes

- Introduce `accumulatorVersions`, add unified `addAccumulator` and `updateAccumulator` methods'

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.35.0

## 0.27.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.34.0

## 0.27.0

### Minor Changes

- Update id mapping to reflect latest `testnet` state, misc tweaks

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.33.0

## 0.26.0

### Minor Changes

- Move `getVerificationMethod` logic to the `CustomLinkedDataSignature`

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.32.0

## 0.25.0

### Minor Changes

- Refine the search algorithm for locating verification method references.

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.31.0

## 0.24.0

### Minor Changes

- Enable auto-conversion on verification method comparison

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.30.0

## 0.23.0

### Minor Changes

- Deduplicate prefixes/methods for the `Resolver`s

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.29.0

## 0.22.0

### Minor Changes

- Allow to create keypairs from private keys, conversion tweaks

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.28.0

## 0.21.0

### Minor Changes

- Legacy documents support for `testnet`

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.27.0

## 0.20.0

### Minor Changes

- Fix `JSON` import + misc tweaks

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.26.0

## 0.19.0

### Minor Changes

- Support legacy DidDocuments on `cheqd` mainnet

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.25.0

## 0.18.0

### Minor Changes

- Align with the latest `cheqd` node version (`3.1.3`)

## 0.17.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.23.0

## 0.17.0

### Minor Changes

- Implementation of the `cheqd` migration and the associated identifier mappers.
- Updated dependencies
  - @docknetwork/credential-sdk@0.22.0

## 0.16.0

### Minor Changes

- Remove debug code

## 0.15.0

### Minor Changes

- Serialization/deserialization tweaks for `cheqd`

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.21.0

## 0.14.5

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.20.0

## 0.14.4

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.19.0

## 0.14.3

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.18.0

## 0.14.2

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.17.0

## 0.14.1

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.16.0

## 0.14.0

### Minor Changes

- Modify the `SDK` to be compatible with the most recent `cheqd` node.

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.15.0

## 0.13.0

### Minor Changes

- `StatusListCredential` module for `cheqd`, misc tweaks

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.14.0

## 0.12.0

### Minor Changes

- Small refactoring of the `did/document`

### Patch Changes

## 0.11.1

### Patch Changes

- Audit fixes and RDF lib upgrade
- Updated dependencies
  - @docknetwork/credential-sdk@0.13.0

## 0.11.0

### Minor Changes

- Allow to pass `wallet` to `CheqdAPI`, misc tweaks

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.12.0

## 0.10.0

### Minor Changes

- Tweaks for `lastPublicKeyId` and `nextPublicKeyId`

### Patch Changes

- Updated dependencies
  - @docknetwork/credential-sdk@0.11.0

## 0.9.0

- Allow to use `MultiApiCoreModules` with `CheqdCoreModules`
- Updated dependencies
  - @docknetwork/credential-sdk@0.10.0

## 0.8.0

### Minor Changes

- Switch `@cheqd/sdk` to the `cjs` tag

## 0.7.0

### Minor Changes

- Fix `cheqd` import

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
