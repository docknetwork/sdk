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
    const counter = (await this.api.query[this.moduleName].paramsCounter(hexId));
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
    const counter = (await this.api.query[this.moduleName].paramsCounter(hexId));
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
    return this.api.query[this.moduleName].bbsPlusParams(hexDid, counter);
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    return this.api.query[this.moduleName].bbsPlusKeys(hexDid, keyId);
  }

  /**
   * Create transaction to add a BBS+ public key
   * @param publicKey - BBS+ public key to add.
   * @param targetDid - The DID to which key is being added
   * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddPublicKeyTx(publicKey, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addPk, signature] = await this.createSignedAddPublicKey(publicKey, targetHexDid, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addPublicKey(addPk, signature);
  }

  /**
   * Create transaction to remove BBS+ public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createRemovePublicKeyTx(removeKeyId, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removePk, signature] = await this.createSignedRemovePublicKey(removeKeyId, targetHexDid, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.removePublicKey(removePk, signature);
  }

  /**
   * Add a BBS+ public key
   * @param publicKey - BBS+ public key to add.
   * @param targetDid - The DID to which key is being added
   * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addPublicKey(publicKey, targetDid, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddPublicKeyTx(publicKey, targetDid, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove BBS+ public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
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
    const removeKey = { keyRef: [targetHexDid, removeKeyId], did: targetHexDid, nonce };
    const signature = this.signRemovePublicKey(keyPair, removeKey);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [removeKey, didSig];
  }

  /**
   *
   * @param keyPair
   * @param params
   * @returns {Signature}
   */
  signAddParams(keyPair, params) {
    const serialized = getStateChange(this.api, 'AddBBSPlusParams', params);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  /**
   *
   * @param keyPair
   * @param pk
   * @returns {Signature}
   */
  signAddPublicKey(keyPair, pk) {
    const serialized = getStateChange(this.api, 'AddBBSPlusPublicKey', pk);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  /**
   *
   * @param keyPair
   * @param ref
   * @returns {Signature}
   */
  signRemoveParams(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveBBSPlusParams', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  /**
   *
   * @param keyPair
   * @param ref
   * @returns {Signature}
   */
  signRemovePublicKey(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveBBSPlusPublicKey', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }
}
