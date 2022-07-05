/* eslint-disable camelcase */

import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import WithParamsAndPublicKeys from './WithParamsAndPublicKeys';
import { createDidSig, getHexIdentifierFromDID } from '../utils/did';

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

  /**
   * Get last params written by this DID
   * @param did
   * @returns {Promise<{bytes: string}|null>}
   */
  async getLastParamsWritten(did) {
    const hexId = getHexIdentifierFromDID(did);
    const counter = (await this.api.query[this.moduleName].paramsCounter(hexId))[0];
    if (counter > 0) {
      const resp = await this.queryParamsFromChain(hexId, counter);
      if (resp.isSome) {
        return this.createParamsObjFromChainResponse(resp.unwrap());
      }
    }
    return null;
  }

  /**
   * Get all params written by a DID
   * @param did
   * @returns {Promise<object[]>}
   */
  async getAllParamsByDid(did) {
    const hexId = getHexIdentifierFromDID(did);

    const params = [];
    const counter = (await this.api.query[this.moduleName].paramsCounter(hexId))[0];
    if (counter > 0) {
      for (let i = 1; i <= counter; i++) {
        // eslint-disable-next-line no-await-in-loop
        const param = await this.getParamsByHexDid(hexId, i);
        if (param !== null) {
          params.push(param);
        }
      }
    }
    return params;
  }

  async queryParamsFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].bbsPlusParams(hexDid, { 0: counter });
  }

  async queryPublicKeyFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].bbsPlusKeys(hexDid, { 0: counter });
  }

  async createSignedAddPublicKey(didModule, publicKey, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await didModule.getNextNonceForDID(controllerHexDid);
    }
    const addPk = { key: publicKey, did: hexDid, nonce };
    const signature = this.signAddPublicKey(keyPair, addPk);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [addPk, didSig];
  }

  async createSignedRemovePublicKey(didModule, did, removeKeyId, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await didModule.getNextNonceForDID(controllerHexDid);
    }
    const removeKey = { key_ref: [{ 0: hexDid }, { 0: removeKeyId }], did: hexDid, nonce };
    const signature = this.signRemovePublicKey(keyPair, removeKey);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [removeKey, didSig];
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
