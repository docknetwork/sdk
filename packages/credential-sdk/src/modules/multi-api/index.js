import { AbstractCoreModules } from '../abstract';
import MultiApiAccumulatorModule from './accumulator';
import MultiApiAttestModule from './attest';
import MultiApiBlobModule from './blob';
import MultiApiDIDModule from './did';
import MultiApiOffchainSignaturesModule from './offchain-signatures';
import MultiApiStatusListCredentialModule from './status-list-credential';
import MultiApiTrustRegistryModule from './trust-registry';

/**
 * Class representing a set of core modules each of which is an instance of its respective abstract module.
 */
export class MultiApiCoreModules extends AbstractCoreModules {
  static AccumulatorModule = MultiApiAccumulatorModule;

  static AnchorModule = null;

  static AttestModule = MultiApiAttestModule;

  static BlobModule = MultiApiBlobModule;

  static DIDModule = MultiApiDIDModule;

  static OffchainSignaturesModule = MultiApiOffchainSignaturesModule;

  static BBSModule = MultiApiOffchainSignaturesModule;

  static BBSPlusModule = MultiApiOffchainSignaturesModule;

  static PSModule = MultiApiOffchainSignaturesModule;

  static StatusListCredentialModule = MultiApiStatusListCredentialModule;

  static TrustRegistryModule = MultiApiTrustRegistryModule;

  attachModule(prop, { key, optional }, [modules]) {
    return super.attachModule(prop, { key, optional }, [
      modules.map(({ [key]: module }) => module),
    ]);
  }
}

export {
  MultiApiAccumulatorModule,
  MultiApiAttestModule,
  MultiApiBlobModule,
  MultiApiDIDModule,
  MultiApiOffchainSignaturesModule,
  MultiApiStatusListCredentialModule,
  MultiApiTrustRegistryModule,
};
