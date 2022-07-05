/* eslint-disable camelcase */

import { getNonce, getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
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

  async createAddPublicKeyTx(publicKey, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addPk, signature] = await this.createSignedAddPublicKey(publicKey, targetHexDid, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addPublicKey(addPk, signature);
  }

  async createRemovePublicKeyTx(removeKeyId, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removePk, signature] = await this.createSignedRemovePublicKey(removeKeyId, targetHexDid, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.removePublicKey(removePk, signature);
  }

  async addPublicKey(publicKey, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddPublicKeyTx(publicKey, targetDid, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async removePublicKey(removeKeyId, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createRemovePublicKeyTx(removeKeyId, targetDid, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createSignedAddPublicKey(publicKey, targetHexDid, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const addPk = { key: publicKey, did: targetHexDid, nonce };
    const signature = this.signAddPublicKey(keyPair, addPk);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [addPk, didSig];
  }

  async createSignedRemovePublicKey(removeKeyId, targetHexDid, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const removeKey = { key_ref: [{ 0: targetHexDid }, { 0: removeKeyId }], did: targetHexDid, nonce };
    const signature = this.signRemovePublicKey(keyPair, removeKey);
    const didSig = createDidSig(signerHexDid, keyId, signature);
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
