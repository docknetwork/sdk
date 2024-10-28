import { ensurePrototypeOf } from '../../utils';
import AbstractAccumulatorModule from './accumulator/module';
import AbstractAnchorModule from './anchor/module';
import AbstractAttestModule from './attest/module';
import AbstractBlobModule from './blob/module';
import AbstractDIDModule from './did/module';
import AbstractOffchainSignaturesModule from './offchain-signatures/module';
import AbstractStatusListCredentialModule from './status-list-credential/module';
import AbstractTrustRegistryModule from './trust-registry/module';

/**
 * Class representing a set of core modules each of which is an instance of its respective abstract module.
 */
export class AbstractCoreModules {
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
    OffchainSignaturesModule: { key: 'offchainSignatures', optional: false },
    BBSModule: { key: 'bbs', optional: false },
    BBSPlusModule: { key: 'bbsPlus', optional: false },
    PSModule: { key: 'ps', optional: false },
    StatusListCredentialModule: {
      key: 'statusListCredential',
      optional: false,
    },
    TrustRegistryModule: { key: 'trustRegistry', optional: false },
  };

  attachModule(prop, { key, optional }, args) {
    const { [prop]: Module } = this.constructor;

    if (Module == null) {
      if (optional) {
        return this;
      }

      throw new Error(`No such module: ${prop}`);
    }

    ensurePrototypeOf(AbstractCoreModules[prop], Module);
    const mod = new Module(...args);
    this[key] = mod;

    return this;
  }

  constructor(...args) {
    for (const [prop, key] of Object.entries(this.constructor.ModuleMap)) {
      this.attachModule(prop, key, args);
    }
  }
}

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
