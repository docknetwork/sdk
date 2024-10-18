import { AbstractCoreModules } from '@docknetwork/credential-sdk/modules';
import CheqdAttestModule from './attest/module';
import CheqdBlobModule from './blob/module';
import CheqdDIDModule from './did/module';
// import CheqdAccumulatorModule from './accumulator/module';
// import CheqdAnchorModule from './anchor/module';
// import CheqdOffchainSignaturesModule from './offchain-signatures/module';
// import CheqdBBSModule from './offchain-signatures/bbs';
// import CheqdBBSPlusModule from './offchain-signatures/bbs-plus';
// import CheqdPSModule from './offchain-signatures/ps';
// import CheqdStatusListCredentialModule from './status-list-credential/module';
// import CheqdTrustRegistryModule from './trust-registry/module';

export class CheqdCoreModules extends AbstractCoreModules {
  // static AccumulatorModule = CheqdAccumulatorModule;

  // static AnchorModule = CheqdAnchorModule;

  static AttestModule = CheqdAttestModule;

  static BlobModule = CheqdBlobModule;

  static DIDModule = CheqdDIDModule;

  // static OffchainSignaturesModule = CheqdOffchainSignaturesModule;

  // static BBSModule = CheqdBBSModule;

  // static BBSPlusModule = CheqdBBSPlusModule;

  // static PSModule = CheqdPSModule;

  // static StatusListCredentialModule = CheqdStatusListCredentialModule;

  // static TrustRegistryModule = CheqdTrustRegistryModule;
}

export {
  CheqdAttestModule,
  CheqdDIDModule,
  CheqdBlobModule,
  // CheqdAccumulatorModule,
  // CheqdAnchorModule,
  // ,
  // CheqdOffchainSignaturesModule,
  // CheqdBBSModule,
  // CheqdBBSPlusModule,
  // CheqdPSModule,
  // CheqdStatusListCredentialModule,
  // CheqdTrustRegistryModule,
};
