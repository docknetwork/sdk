/* eslint-disable camelcase */

import OffchainSignaturesModule from './offchain-signatures';
import BBSPublicKey from '../offchain-signatures/public-keys/bbs';
import BBSParams from '../offchain-signatures/params/bbs';

/** Class to write `BBS` parameters and keys on chain */
export default class BBSModule extends OffchainSignaturesModule {
  /// Builds `BBS` params from the provided value.
  static buildParams(params) {
    return new BBSParams(params);
  }

  /// Builds `BBS` public key from the provided value.
  static buildPublicKey(publicKey) {
    return new BBSPublicKey(publicKey);
  }

  async queryParamsFromChain(hexDid, counter) {
    const params = await super.queryParamsFromChain(hexDid, counter);

    if (params != null && params.isBbs) {
      return params.asBbs;
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    const key = await super.queryPublicKeyFromChain(hexDid, keyId);

    if (key != null && key.isBbs) {
      return key.asBbs;
    } else {
      return null;
    }
  }
}
