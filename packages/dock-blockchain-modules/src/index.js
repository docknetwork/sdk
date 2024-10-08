import { AbstractCoreModules } from '@docknetwork/credential-sdk/modules';
import DockAttestModule from './attest/module';
import DockDIDModule from './did/module';
import DockAccumulatorModule from './accumulator/module';
import DockAnchorModule from './anchor/module';
import DockBlobModule from './blob/module';
import DockOffchainSignaturesModule from './offchain-signatures/module';
import DockBBSModule from './offchain-signatures/bbs';
import DockBBSPlusModule from './offchain-signatures/bbs-plus';
import DockPSModule from './offchain-signatures/ps';
import DockStatusListCredentialModule from './status-list-credential/module';
import DockTrustRegistryModule from './trust-registry/module';

export class DockCoreModules extends AbstractCoreModules {
  static AccumulatorModule = DockAccumulatorModule;

  static AnchorModule = DockAnchorModule;

  static AttestModule = DockAttestModule;

  static BlobModule = DockBlobModule;

  static DIDModule = DockDIDModule;

  static OffchainSignaturesModule = DockOffchainSignaturesModule;

  static BBSModule = DockBBSModule;

  static BBSPlusModule = DockBBSPlusModule;

  static PSModule = DockPSModule;

  static StatusListCredentialModule = DockStatusListCredentialModule;

  static TrustRegistryModule = DockTrustRegistryModule;
}

export {
  DockAttestModule,
  DockDIDModule,
  DockAccumulatorModule,
  DockAnchorModule,
  DockBlobModule,
  DockOffchainSignaturesModule,
  DockBBSModule,
  DockBBSPlusModule,
  DockPSModule,
  DockStatusListCredentialModule,
  DockTrustRegistryModule,
};
