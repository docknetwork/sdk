/* eslint-disable camelcase */

import { AbstractOffchainSignaturesModule } from "@docknetwork/credential-sdk/modules";
import DockInternalOffchainSignaturesModule from "./internal";
import { injectDock, withParams } from "../common";

/** Class to write offchain signature parameters and keys on chain */
export default class DockOffchainSignaturesModule extends withParams(
  injectDock(AbstractOffchainSignaturesModule)
) {
  static DockOnly = DockInternalOffchainSignaturesModule;

  static get Params() {
    return this.DockOnly.Params;
  }
}
