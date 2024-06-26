/* eslint-disable camelcase */

import { getDidNonce, getStateChange } from "../utils/misc";
import WithParamsAndPublicKeys from "./WithParamsAndPublicKeys";
import { createDidSig, DockDidOrDidMethodKey } from "../utils/did";

const STATE_CHANGES = {
  AddParams: "AddOffchainSignatureParams",
  RemoveParams: "RemoveOffchainSignatureParams",
  AddPublicKey: "AddOffchainSignaturePublicKey",
  RemovePublicKey: "RemoveOffchainSignaturePublicKey",
};

const METHODS = {
  Params: "signatureParams",
  PublicKeys: "publicKeys",
};

/** Class to write offchain signature parameters and keys on chain */
export default class OffchainSignaturesModule extends WithParamsAndPublicKeys {
  /**
   * sets the dock api for this module
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param {Function} signAndSend - Callback signing and sending
   */
  constructor(api, signAndSend) {
    super();
    this.api = api;
    this.moduleName = "offchainSignatures";
    this.stateChanges = STATE_CHANGES;
    this.methods = METHODS;
    this.module = api.tx[this.moduleName];
    this.signAndSend = signAndSend;
  }

  /**
   * Builds module-specific public key from the provided value.
   */
  static buildPublicKey(publicKey) {
    return publicKey;
  }

  /**
   * Get last params written by this DID
   * @param did
   * @returns {Promise<{bytes: string}|null>}
   */
  async getLastParamsWritten(did) {
    const hexId = DockDidOrDidMethodKey.from(did);
    const counter = await this.api.query[this.moduleName].paramsCounter(hexId);
    if (counter > 0) {
      const resp = await this.queryParamsFromChain(hexId, counter);
      if (resp) {
        return this.createParamsObjFromChainResponse(resp);
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
    const hexId = DockDidOrDidMethodKey.from(did);

    const params = [];
    const counter = await this.api.query[this.moduleName].paramsCounter(hexId);
    if (counter > 0) {
      for (let i = 1; i <= counter; i++) {
        // eslint-disable-next-line no-await-in-loop
        const param = await this.getParamsByHexDid(hexId, i);
        if (param != null) {
          params.push(param);
        }
      }
    }
    return params;
  }

  async queryParamsFromChain(hexDid, counter) {
    const params = await this.api.query[this.moduleName][this.methods.Params](
      hexDid,
      counter,
    );

    if (params.isSome) {
      return params.unwrap();
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    const key = await this.api.query[this.moduleName][this.methods.PublicKeys](
      hexDid.asDid,
      keyId,
    );

    if (key.isSome) {
      return key.unwrap();
    } else {
      return null;
    }
  }

  /**
   * Create transaction to add a public key
   * @param publicKey - public key to add.
   * @param targetDid - The DID to which key is being added
   * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signingKeyRef
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddPublicKeyTx(
    publicKey,
    targetDid,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const offchainPublicKey = this.constructor.buildPublicKey(publicKey);
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [addPk, signature] = await this.createSignedAddPublicKey(
      offchainPublicKey,
      targetHexDid,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.addPublicKey(addPk, signature);
  }

  /**
   * Create transaction to remove public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signingKeyRef
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createRemovePublicKeyTx(
    removeKeyId,
    targetDid,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [removePk, signature] = await this.createSignedRemovePublicKey(
      removeKeyId,
      targetHexDid,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.removePublicKey(removePk, signature);
  }

  /**
   * Add a public key
   * @param publicKey - public key to add.
   * @param targetDid - The DID to which key is being added
   * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signingKeyRef
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addPublicKey(
    publicKey,
    targetDid,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddPublicKeyTx(
      publicKey,
      targetDid,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signing key reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removePublicKey(
    removeKeyId,
    targetDid,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemovePublicKeyTx(
      removeKeyId,
      targetDid,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createSignedAddPublicKey(
    publicKey,
    targetHexDid,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const addPk = { key: publicKey, did: targetHexDid, nonce };
    const signature = this.signAddPublicKey(signingKeyRef, addPk);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [addPk, didSig];
  }

  async createSignedRemovePublicKey(
    removeKeyId,
    targetHexDid,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const removeKey = {
      keyRef: [targetHexDid, removeKeyId],
      did: targetHexDid,
      nonce,
    };
    const signature = this.signRemovePublicKey(signingKeyRef, removeKey);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [removeKey, didSig];
  }

  /**
   *
   * @param signingKeyRef
   * @param params
   * @returns {Signature}
   */
  signAddParams(signingKeyRef, params) {
    const serialized = getStateChange(
      this.api,
      this.stateChanges.AddParams,
      params,
    );
    return signingKeyRef.sign(serialized);
  }

  /**
   *
   * @param signingKeyRef
   * @param pk
   * @returns {Signature}
   */
  signAddPublicKey(signingKeyRef, pk) {
    const serialized = getStateChange(
      this.api,
      this.stateChanges.AddPublicKey,
      pk,
    );
    return signingKeyRef.sign(serialized);
  }

  /**
   *
   * @param signingKeyRef
   * @param ref
   * @returns {Signature}
   */
  signRemoveParams(signingKeyRef, ref) {
    const serialized = getStateChange(
      this.api,
      this.stateChanges.RemoveParams,
      ref,
    );
    return signingKeyRef.sign(serialized);
  }

  /**
   *
   * @param signingKeyRef
   * @param ref
   * @returns {Signature}
   */
  signRemovePublicKey(signingKeyRef, ref) {
    const serialized = getStateChange(
      this.api,
      this.stateChanges.RemovePublicKey,
      ref,
    );
    return signingKeyRef.sign(serialized);
  }
}
