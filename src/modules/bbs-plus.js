/* eslint-disable camelcase */

import OffchainSignatures from './offchain-signatures';
import BBSPlusPublicKey from '../offchain-signatures/public-keys/bbs-plus';
import BBSPlusParams from '../offchain-signatures/params/bbs-plus';

/** Class to write BBS+ parameters and keys on chain */
export default class BBSPlusModule extends OffchainSignatures {
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
    return new BBSPlusParams(params)
  }

  static buildPublicKey(publicKey) {
    return new BBSPlusPublicKey(publicKey)
  }
}
