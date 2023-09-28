/* eslint-disable camelcase */

import OffchainSignaturesModule from './offchain-signatures';
import PSPublicKey from '../offchain-signatures/public-keys/ps';
import PSParams from '../offchain-signatures/params/ps';

/** Class to write `Pointcheval-Sanders` parameters and keys on chain */
export default class PSModule extends OffchainSignaturesModule {
  /// Builds `Pointcheval-Sanders` params from the provided value.
  static buildParams(params) {
    return new PSParams(params);
  }

  /// Builds `Pointcheval-Sanders` public key from the provided value.
  static buildPublicKey(publicKey) {
    return new PSPublicKey(publicKey);
  }

  async queryParamsFromChain(hexDid, counter) {
    const params = await super.queryParamsFromChain(hexDid, counter);

    if (params != null && params.isPs) {
      return params.asPs;
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    const key = await super.queryPublicKeyFromChain(hexDid, keyId);

    if (key != null && key.isPs) {
      return key.asPs;
    } else {
      return null;
    }
  }
}
