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
  static get ModuleMap() {
    // Allows to instantiate `MultiApiCoreModules` over `CheqdCoreModules`

    return {
      ...super.ModuleMap,
      AccumulatorModule: { key: 'accumulator', optional: true },
      StatusListCredentialModule: {
        key: 'statusListCredential',
        optional: true,
      },
      TrustRegistryModule: { key: 'trustRegistry', optional: true },
    };
  }

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
      modules.map(({ [key]: module }) => {
        if (module == null && !optional) {
          throw new Error(`\`${prop}\` module is missing`);
        }

        return module;
      }).filter(Boolean),
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
