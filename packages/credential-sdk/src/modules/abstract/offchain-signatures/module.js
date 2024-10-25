/* eslint-disable camelcase */

import {
  OffchainSignatureParams,
  OffchainSignaturePublicKey,
} from '../../../types';
import { AbstractWithParamsAndPublicKeys } from '../common';

/** Class to write offchain signature parameters and keys on chain */
export default class AbstractOffchainSignaturesModule extends AbstractWithParamsAndPublicKeys {
  static Params = OffchainSignatureParams;

  static PublicKey = OffchainSignaturePublicKey;

  static prepareAddParameters(bytes, label, curveType) {
    return super.prepareAddParameters(
      new this.Params.Class(bytes, label, curveType),
    );
  }

  static prepareAddPublicKey(bytes, paramsRef, curveType) {
    return super.prepareAddPublicKey(
      new this.PublicKey.Class(bytes, paramsRef, curveType),
    );
  }
}
