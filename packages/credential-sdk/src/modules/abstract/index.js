import { ensurePrototypeOf } from "../../utils";
import AbstractAccumulatorModule from "./accumulator/module";
import AbstractAnchorModule from "./anchor/module";
import AbstractAttestModule from "./attest/module";
import AbstractBlobModule from "./blob/module";
import AbstractDIDModule from "./did/module";
import AbstractOffchainSignaturesModule from "./offchain-signatures/module";
import AbstractStatusListCredentialModule from "./status-list-credential/module";
import AbstractTrustRegistryModule from "./trust-registry/module";

/**
 * Class representing a set of core modules each of which is an instance of its respective abstract module.
 */
export class AbstractCoreModules {
  static AccumulatorModule;

  static AnchorModule;

  static AttestModule;

  static BlobModule;

  static DIDModule;

  static OffchainSignaturesModule;

  static BBSModule;

  static BBSPlusModule;

  static PSModule;

  static StatusListCredentialModule;

  static TrustRegistryModule;

  constructor(apiProvider) {
    const {
      AccumulatorModule,
      AnchorModule,
      AttestModule,
      BlobModule,
      DIDModule,
      OffchainSignaturesModule,
      BBSModule,
      BBSPlusModule,
      PSModule,
      StatusListCredentialModule,
      TrustRegistryModule,
    } = this.constructor;

    ensurePrototypeOf(AbstractAccumulatorModule, AccumulatorModule);
    if (AnchorModule != null) {
      ensurePrototypeOf(AbstractAnchorModule, AnchorModule);
    }
    ensurePrototypeOf(AbstractAttestModule, AttestModule);
    ensurePrototypeOf(AbstractBlobModule, BlobModule);
    ensurePrototypeOf(AbstractDIDModule, DIDModule);
    ensurePrototypeOf(
      AbstractOffchainSignaturesModule,
      OffchainSignaturesModule
    );
    ensurePrototypeOf(AbstractOffchainSignaturesModule, BBSModule);
    ensurePrototypeOf(AbstractOffchainSignaturesModule, BBSPlusModule);
    ensurePrototypeOf(AbstractOffchainSignaturesModule, PSModule);
    ensurePrototypeOf(
      AbstractStatusListCredentialModule,
      StatusListCredentialModule
    );
    ensurePrototypeOf(AbstractTrustRegistryModule, TrustRegistryModule);

    this.accumulator = new AccumulatorModule(apiProvider);
    if (AnchorModule != null) {
      this.anchor = new AnchorModule(apiProvider);
    }
    this.attest = new AttestModule(apiProvider);
    this.blob = new BlobModule(apiProvider);
    this.did = new DIDModule(apiProvider);
    this.offchainSignatures = new OffchainSignaturesModule(apiProvider);
    this.bbs = new BBSModule(apiProvider);
    this.bbsPlus = new BBSPlusModule(apiProvider);
    this.ps = new PSModule(apiProvider);
    this.statusListCredential = new StatusListCredentialModule(apiProvider);
    this.trustRegistry = new TrustRegistryModule(apiProvider);
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

export { default as Schema } from "./schema/module";
export { AccumulatorType } from "./accumulator";
