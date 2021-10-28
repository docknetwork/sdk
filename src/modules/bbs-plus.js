/* eslint-disable camelcase */

import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import WithParamsAndPublicKeys from './WithParamsAndPublicKeys';

/** Class to write BBS+ parameters and keys on chain */
export default class BBSPlusModule extends WithParamsAndPublicKeys {
  /**
   * sets the dock api for this module
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param {Function} signAndSend - Callback signing and sending
   */
  constructor(api, signAndSend) {
    super();
    this.api = api;
    this.moduleName = 'bbsPlus';
    this.module = api.tx[this.moduleName];
    this.signAndSend = signAndSend;
  }

  async queryParamsFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].bbsPlusParams(hexDid, counter);
  }

  async queryPublicKeyFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].bbsPlusKeys(hexDid, counter);
  }

  signAddParams(keyPair, params) {
    const serialized = getStateChange(this.api, 'AddBBSPlusParams', params);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signAddPublicKey(keyPair, pk) {
    const serialized = getStateChange(this.api, 'AddBBSPlusPublicKey', pk);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemoveParams(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveBBSPlusParams', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemovePublicKey(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveBBSPlusPublicKey', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }
}
