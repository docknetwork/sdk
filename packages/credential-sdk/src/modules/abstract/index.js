import { ensurePrototypeOf, withExtendedStaticProperties } from '../../utils';
import AbstractAccumulatorModule from './accumulator/module';
import AbstractAnchorModule from './anchor/module';
import AbstractAttestModule from './attest/module';
import AbstractBlobModule from './blob/module';
import { AbstractBaseModule } from './common';
import AbstractDIDModule from './did/module';
import AbstractOffchainSignaturesModule from './offchain-signatures/module';
import AbstractStatusListCredentialModule from './status-list-credential/module';
import AbstractTrustRegistryModule from './trust-registry/module';

/**
 * Class representing a set of core modules each of which is an instance of its respective abstract module.
 */
export const AbstractCoreModules = withExtendedStaticProperties(
  [
    'AccumulatorModule',
    'AnchorModule',
    'AttestModule',
    'BlobModule',
    'DIDModule',
    'OffchainSignaturesModule',
    'BBSModule',
    'BBSPlusModule',
    'PSModule',
    'StatusListCredentialModule',
    'TrustRegistryModule',
  ],
  class AbstractCoreModules extends AbstractBaseModule {
    static AccumulatorModule = AbstractAccumulatorModule;

    static AnchorModule = AbstractAnchorModule;

    static AttestModule = AbstractAttestModule;

    static BlobModule = AbstractBlobModule;

    static DIDModule = AbstractDIDModule;

    static OffchainSignaturesModule = AbstractOffchainSignaturesModule;

    static BBSModule = AbstractOffchainSignaturesModule;

    static BBSPlusModule = AbstractOffchainSignaturesModule;

    static PSModule = AbstractOffchainSignaturesModule;

    static StatusListCredentialModule = AbstractStatusListCredentialModule;

    static TrustRegistryModule = AbstractTrustRegistryModule;

    static ModuleMap = {
      AccumulatorModule: { key: 'accumulator', optional: false },
      AnchorModule: { key: 'anchor', optional: true },
      AttestModule: { key: 'attest', optional: false },
      BlobModule: { key: 'blob', optional: false },
      DIDModule: { key: 'did', optional: false },
      OffchainSignaturesModule: {
        key: 'offchainSignatures',
        optional: false,
      },
      BBSModule: { key: 'bbs', optional: false },
      BBSPlusModule: { key: 'bbsPlus', optional: false },
      PSModule: { key: 'ps', optional: false },
      StatusListCredentialModule: {
        key: 'statusListCredential',
        optional: false,
      },
      TrustRegistryModule: { key: 'trustRegistry', optional: false },
    };

    constructor(...args) {
      super();

      for (const [prop, key] of Object.entries(this.constructor.ModuleMap)) {
        this.attachModule(prop, key, args);
      }
    }

    attachModule(prop, { key, optional }, args) {
      const { [prop]: Module } = this.constructor;

      if (Module == null) {
        if (optional) {
          return this;
        }

        throw new Error(`No such module: ${prop}`);
      }

      ensurePrototypeOf(AbstractCoreModules[prop], Module);
      this[key] = new Module(...args);

      return this;
    }

    methods() {
      return this.apiProvider.methods();
    }
  },
);

export {
  AbstractAccumulatorModule,
  AbstractAnchorModule,
  AbstractAttestModule,
  AbstractBlobModule,
  AbstractDIDModule,
  AbstractOffchainSignaturesModule,
  AbstractStatusListCredentialModule,
  AbstractTrustRegistryModule,
};

export { default as Schema } from './schema/module';
export { AccumulatorType } from './accumulator';
