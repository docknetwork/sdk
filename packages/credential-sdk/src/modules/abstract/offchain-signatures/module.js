/* eslint-disable camelcase */

import { OffchainSignatureParams } from "../../../types";
import { AbstractBaseModule, withAbstractParams } from "../common";

/** Class to write offchain signature parameters on chain */
export default class AbstractOffchainSignaturesModule extends withAbstractParams(
  AbstractBaseModule
) {
  static Params = OffchainSignatureParams;

  static prepareAddParameters(bytes, label, curveType) {
    return super.prepareAddParameters(
      new this.Params.Class(bytes, label, curveType)
    );
  }
}
