import { AbstractCoreModules } from "../abstract";
import MultiApiAccumulatorModule from "./accumulator";
import MultiApiAttestModule from "./attest";
import MultiApiBlobModule from "./blob";
import MultiApiDIDModule from "./did";
import MultiApiOffchainSignaturesModule from "./offchain-signatures";
import MultiApiStatusListCredentialModule from "./status-list-credential";
import MultiApiTrustRegistryModule from "./trust-registry";

/**
 * Class representing a set of core modules each of which is an instance of its respective abstract module.
 */
export class MultiApiCoreModules extends AbstractCoreModules {
  static Accumulator = MultiApiAccumulatorModule;

  static Attest = MultiApiAttestModule;

  static Blob = MultiApiBlobModule;

  static Did = MultiApiDIDModule;

  static OffchainSignatures = MultiApiOffchainSignaturesModule;

  static BBS = MultiApiOffchainSignaturesModule;

  static BBSPlus = MultiApiOffchainSignaturesModule;

  static PS = MultiApiOffchainSignaturesModule;

  static StatusListCredential = MultiApiStatusListCredentialModule;

  static TrustRegistry = MultiApiTrustRegistryModule;
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
