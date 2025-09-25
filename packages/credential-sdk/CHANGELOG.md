# @docknetwork/credential-sdk

## 0.54.5

### Patch Changes

- Support various DID key identifiers

## 0.54.4

### Patch Changes

- Use latest cheqd image tag and gas estimation

## 0.54.3

### Patch Changes

- Fix serialization equality

## 0.54.2

### Patch Changes

- Fix equality checks

## 0.54.1

### Patch Changes

- Patch TX serialize to JSON

## 0.54.0

### Minor Changes

- Fix DIDCommMessaging serialization

## 0.53.0

### Minor Changes

- Fix didcomm service endpoint type for latest cheqd SDK

## 0.52.0

### Minor Changes

- Support DIDComm service endpoint

## 0.51.0

### Minor Changes

- Package cleanup

## 0.50.0

### Minor Changes

- Docs and improvements

## 0.49.0

### Minor Changes

- Remove obsolete dependencies and packages

## 0.48.0

### Minor Changes

- Introduce `CheqdMultiSenderAPI` + small refactoring

## 0.47.0

### Minor Changes

- Upgrade elliptic

## 0.44.0

### Minor Changes

- ldTypeGen support legacy LD term

## 0.43.0

### Minor Changes

- Remove ld.dock.io cache mapping

## 0.42.0

### Minor Changes

- Bump up all packages

## 0.40.0

### Minor Changes

- Export blob resolver

## 0.39.0

### Minor Changes

- Add tests for all types of identifiers that can be received by the modules, use replacement resolver for DID documents

## 0.39.0

### Minor Changes

- Use parsed accumulator identifier in `createAccumulator`/`updateAccumulator` calls

## 0.38.0

### Minor Changes

- Fix the `updateAccumulatorTx` call

## 0.37.0

### Minor Changes

- Improvements and simplifications

## 0.36.0

### Minor Changes

- Use newest DID document format for `cheqd` `mainnet`

## 0.35.0

### Minor Changes

- Introduce `accumulatorVersions`, add unified `addAccumulator` and `updateAccumulator` methods'

## 0.34.0

### Minor Changes

- Expose `accumulatorHistory`

## 0.33.0

### Minor Changes

- Update id mapping to reflect latest `testnet` state, misc tweaks

## 0.32.0

### Minor Changes

- Move `getVerificationMethod` logic to the `CustomLinkedDataSignature`

## 0.31.0

### Minor Changes

- Refine the search algorithm for locating verification method references.

## 0.30.0

### Minor Changes

- Enable auto-conversion on verification method comparison

## 0.29.0

### Minor Changes

- Deduplicate prefixes/methods for the `Resolver`s

## 0.28.0

### Minor Changes

- Allow to create keypairs from private keys, conversion tweaks

## 0.27.0

### Minor Changes

- Legacy documents support for `testnet`

## 0.26.0

### Minor Changes

- Fix `JSON` import + misc tweaks

## 0.25.0

### Minor Changes

- Support legacy DidDocuments on `cheqd` mainnet

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
