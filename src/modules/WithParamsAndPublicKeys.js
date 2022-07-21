/* eslint-disable camelcase */

import { u8aToHex } from '@polkadot/util';
import { createDidSig, getHexIdentifierFromDID } from '../utils/did';
import { getNonce } from '../utils/misc';

/** Class with logic for public keys and corresponding setup parameters. This logic is common in BBS+ and accumulator */
export default class WithParamsAndPublicKeys {
  /**
   * Create object to add new parameters on chain
   * @param bytes
   * @param curveType
   * @param label
   * @returns {{}}
   */
  static prepareAddParameters(bytes, curveType = undefined, label = undefined) {
    const params = {};
    if (bytes === undefined) {
      throw new Error('bytes must be provided');
    } else {
      params.bytes = bytes;
    }
    if (curveType === undefined) {
      params.curveType = 'Bls12381';
    } else if (curveType === 'Bls12381') {
      params.curveType = curveType;
    } else {
      throw new Error(`Invalid curve type ${curveType}`);
    }
    params.label = label;
    return params;
  }

  /**
   * Create object to add new public key on chain
   * @param bytes
   * @param curveType
   * @param paramsRef - Provide if this public key was created using params present on chain.
   * @returns {{}}
   */
  static prepareAddPublicKey(bytes, curveType = undefined, paramsRef = undefined) {
    const publicKey = {};
    if (bytes === undefined) {
      throw new Error('bytes must be provided');
    } else {
      publicKey.bytes = bytes;
    }
    if (curveType === undefined) {
      publicKey.curveType = 'Bls12381';
    } else if (curveType === 'Bls12381') {
      publicKey.curveType = curveType;
    } else {
      throw new Error(`Invalid curve type ${curveType}`);
    }
    publicKey.params_ref = paramsRef !== undefined ? WithParamsAndPublicKeys.parseRef(paramsRef) : undefined;
    return publicKey;
  }

  /**
   * Parse a reference to a param or a public key. A reference uniquely identifies a param or a public key and is a pair
   * of a DID and a positive number starting from 1.
   * @param ref
   * @returns {any[]}
   */
  static parseRef(ref) {
    const parsed = new Array(2);
    if (!(typeof ref === 'object' && ref instanceof Array && ref.length === 2)) {
      throw new Error('Reference should be an array of 2 items');
    }
    try {
      parsed[0] = { 0: getHexIdentifierFromDID(ref[0]) };
    } catch (e) {
      throw new Error(`First item of reference should be a DID but was ${ref[0]}`);
    }
    if (typeof ref[1] !== 'number') {
      throw new Error(`Second item of reference should be a number but was ${ref[1]}`);
    }
    // eslint-disable-next-line prefer-destructuring
    parsed[1] = { 0: ref[1] };
    return parsed;
  }

  /**
   * Create transaction to add new BBS+ params.
   * @param params - The BBS+ params to add.
   * @param signerDid - Signer of the payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddParamsTx(params, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const hexDid = getHexIdentifierFromDID(signerDid);
    const [addParams, signature] = await this.createSignedAddParams(params, hexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addParams(addParams, signature);
  }

  /**
   * Create transaction to remove existing BBS+ params.
   * @param index - Index to uniquely identify BBS+ params
   * @param signerDid - Signer of the payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async removeParamsTx(index, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const hexDid = getHexIdentifierFromDID(signerDid);
    const [removeParams, signature] = await this.createSignedRemoveParams(index, hexDid, keyPair, keyId, { nonce, didModule });
    return this.module.removeParams(removeParams, signature);
  }

  /**
   * Add new BBS+ params.
   * @param param - The BBS+ params to add.
   * @param signerDid - Signer of the payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addParams(param, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddParamsTx(param, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove existing BBS+ params.
   * @param index - Index to uniquely identify BBS+ params
   * @param signerDid - Signer of the blob
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeParams(index, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.removeParamsTx(index, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createSignedAddParams(params, hexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);
    const addParams = { params, nonce };
    const signature = this.signAddParams(keyPair, addParams);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [addParams, didSig];
  }

  async createSignedRemoveParams(index, hexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);
    const removeParams = { params_ref: [{ 0: hexDid }, { 0: index }], nonce };
    const signature = this.signRemoveParams(keyPair, removeParams);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [removeParams, didSig];
  }

  // eslint-disable-next-line no-unused-vars
  async queryParamsFromChain(hexDid, counter) {
    throw new Error('Extending class should implement queryParamsFromChain');
  }

  // eslint-disable-next-line no-unused-vars
  async queryPublicKeyFromChain(hexDid, keyId) {
    throw new Error('Extending class should implement queryPublicKeyFromChain');
  }

  async getParams(did, counter) {
    const hexId = getHexIdentifierFromDID(did);
    return this.getParamsByHexDid(hexId, counter);
  }

  /**
   *
   * @param did
   * @param keyId
   * @param withParams - If true, return the params referenced by the public key. It will throw an error if params_ref is null
   * or params were not found on chain which can happen if they were deleted after this public key was added.
   * @returns {Promise<{bytes: string}|null>}
   */
  async getPublicKey(did, keyId, withParams = false) {
    const hexId = getHexIdentifierFromDID(did);
    return this.getPublicKeyByHexDid(hexId, keyId, withParams);
  }

  async getParamsByHexDid(hexDid, counter) {
    const resp = await this.queryParamsFromChain(hexDid, counter);
    if (resp.isSome) {
      return this.createParamsObjFromChainResponse(resp.unwrap());
    }
    return null;
  }

  async getPublicKeyByHexDid(hexDid, keyId, withParams = false) {
    const resp = await this.queryPublicKeyFromChain(hexDid, keyId);
    if (resp.isSome) {
      const pkObj = this.createPublicKeyObjFromChainResponse(resp.unwrap());
      if (withParams) {
        if (pkObj.params_ref === null) {
          throw new Error('No reference to parameters for the public key');
        } else {
          const params = await this.getParamsByHexDid(pkObj.params_ref[0], pkObj.params_ref[1]);
          if (params === null) {
            throw new Error(`Parameters with reference (${pkObj.params_ref[0]}, ${pkObj.params_ref[1]}) not found on chain`);
          }
          pkObj.params = params;
        }
      }
      return pkObj;
    }
    return null;
  }

  /**
   * Format an object received from the chain as a params object with keys `bytes`, `label` and `curve_type`.
   * @param params
   * @returns {{bytes: string}}
   */
  createParamsObjFromChainResponse(params) {
    const paramsObj = {
      bytes: u8aToHex(params.bytes),
    };
    if (params.curve_type.isBls12381) {
      paramsObj.curve_type = 'Bls12381';
    }
    if (params.label.isSome) {
      paramsObj.label = u8aToHex(params.label.unwrap());
    } else {
      paramsObj.label = null;
    }
    return paramsObj;
  }

  /**
   * Format an object received from the chain as a public key object with keys `bytes`, ` params_ref` and `curve_type`.
   * @param pk
   * @returns {{bytes: string}}
   */
  createPublicKeyObjFromChainResponse(pk) {
    const pkObj = {
      bytes: u8aToHex(pk.bytes),
    };
    if (pk.curve_type.isBls12381) {
      pkObj.curve_type = 'Bls12381';
    }
    if (pk.params_ref.isSome) {
      const pr = pk.params_ref.unwrap();
      pkObj.params_ref = [u8aToHex(pr[0][0][0]), pr[1][0].toNumber()];
    } else {
      pkObj.params_ref = null;
    }
    return pkObj;
  }

  // eslint-disable-next-line no-unused-vars
  signAddParams(keyPair, params) {
    throw new Error('Extending class should implement signAddParams');
  }

  // eslint-disable-next-line no-unused-vars
  signRemoveParams(keyPair, ref) {
    throw new Error('Extending class should implement signRemoveParams');
  }
}
