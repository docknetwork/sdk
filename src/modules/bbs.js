/* eslint-disable camelcase */

import OffchainSignatures from './offchain-signatures';
import BBSPublicKey from '../offchain-signatures/public-keys/bbs';
import BBSParams from '../offchain-signatures/params/bbs';

/** Class to write `BBS` parameters and keys on chain */
export default class BBSModule extends OffchainSignatures {
  /**
   * sets the dock api for this module
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param {Function} signAndSend - Callback signing and sending
   */
  constructor(...args) {
    super(...args);
  }

  static buildParams(params) {
    return new BBSParams(params)
  }

  static buildPublicKey(publicKey) {
    return new BBSPublicKey(publicKey)
  }
}
