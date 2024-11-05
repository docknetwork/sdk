/* eslint-disable camelcase */

import { AbstractOffchainSignaturesModule } from "@docknetwork/credential-sdk/modules";
import { DockOffchainSignatureParamsRef } from "@docknetwork/credential-sdk/types";
import DockInternalOffchainSignaturesModule from "./internal";
import withParams from "../common/with-params";

/** Class to write offchain signature parameters and keys on chain */
export default class DockOffchainSignaturesModule extends withParams(
  AbstractOffchainSignaturesModule
) {
  static DockOnly = DockInternalOffchainSignaturesModule;

  static ParamsRef = DockOffchainSignatureParamsRef;
}
