/* eslint-disable camelcase */

import { OffchainSignatureParams } from "../../../types";
import { AbstractBaseModule } from "../common";
import withParams from "../common/with-params";

/** Class to write offchain signature parameters and keys on chain */
export default class AbstractOffchainSignaturesModule extends withParams(
  AbstractBaseModule
) {
  static Params = OffchainSignatureParams;

  static prepareAddParameters(bytes, label, curveType) {
    return super.prepareAddParameters(
      new this.Params.Class(bytes, label, curveType)
    );
  }
}
