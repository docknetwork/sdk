/* eslint-disable camelcase */

import OffchainSignaturesModule from './offchain-signatures';
import BBSPlusPublicKey from '../offchain-signatures/public-keys/bbs-plus';
import BBSPlusParams from '../offchain-signatures/params/bbs-plus';

/** Class to write `BBS+` parameters and keys on chain */
export default class BBSPlusModule extends OffchainSignaturesModule {
  /// Builds `BBS+` params from the provided value.
  static buildParams(params) {
    return new BBSPlusParams(params);
  }

  /// Builds `BBS+` public key from the provided value.
  static buildPublicKey(publicKey) {
    return new BBSPlusPublicKey(publicKey);
  }

  async queryParamsFromChain(hexDid, counter) {
    const params = await super.queryParamsFromChain(hexDid, counter);

    if (params != null && params.isBbsPlus) {
      return params.asBbsPlus;
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    const key = await super.queryPublicKeyFromChain(hexDid, keyId);

    if (key != null && key.isBbsPlus) {
      return key.asBbsPlus;
    } else {
      return null;
    }
  }
}
