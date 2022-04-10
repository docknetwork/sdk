/* eslint-disable camelcase */

import { u8aToHex } from '@polkadot/util';
import { Tuple } from '@polkadot/types'
import { getHexIdentifierFromDID } from '../utils/did';

/** Class with logic for public keys and corresponding setup parameters. This logic is common in BBS+ and accumulator */
export default class WithParamsAndPublicKeys {
  /**
   * Create object to add new parameters on chain
   * @param bytes
   * @param curveType
   * @param label
   * @returns {{}}
   */
  prepareAddParameters(bytes, curveType = undefined, label = undefined) {
    const params = {};
    if (bytes === undefined) {
      throw new Error('bytes must be provided');
    } else {
      params.bytes = bytes;
    }
    if (curveType === undefined) {
      params.curve_type = 'Bls12381';
    } else if (curveType === 'Bls12381') {
      params.curve_type = curveType;
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
   * @param params_ref - Provide if this public key was created using params present on chain.
   * @returns {{}}
   */
  prepareAddPublicKey(bytes, curveType = undefined, params_ref = undefined) {
    const publicKey = {};
    if (bytes === undefined) {
      throw new Error('bytes must be provided');
    } else {
      publicKey.bytes = bytes;
    }
    if (curveType === undefined) {
      publicKey.curve_type = 'Bls12381';
    } else if (curveType === 'Bls12381') {
      publicKey.curve_type = curveType;
    } else {
      throw new Error(`Invalid curve type ${curveType}`);
    }
    publicKey.params_ref = params_ref !== undefined ? this.api.registry.createType("Option<ParametersStorageKey>", this.parseRef(params_ref)) : undefined;
    return publicKey;
  }

  /**
   * Parse a reference to a param or a public key. A reference uniquely identifies a param or a public key and is a pair
   * of a DID and a positive number starting from 1.
   * @param ref
   * @returns {any[]}
   */
  parseRef(ref) {
    const parsed = new Array(2);
    if (!(typeof ref === 'object' && ref instanceof Array && ref.length === 2)) {
      throw new Error('Reference should be an array of 2 items');
    }
    try {
      parsed[0] = this.api.registry.createType("Did", getHexIdentifierFromDID(ref[0]));
    } catch (e) {
      throw new Error(`First item of reference should be a DID but was ${ref[0]}`);
    }
    if (typeof ref[1] !== 'number') {
      throw new Error(`Second item of reference should be a number but was ${ref[1]}`);
    }
    // eslint-disable-next-line prefer-destructuring
    parsed[1] = ref[1];
    return new Tuple(this.api.registry, ["Did", "u32"], parsed);
  }

  createNewParamsTx(addParams, did, keyPair = undefined, signature = undefined) {
    const hexId = this.api.registry.createType("Did", getHexIdentifierFromDID(did));
    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to register new parameters.');
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signAddParams(keyPair, addParams);
    }
    return this.module.addParams(this.api.registry.createType("AccumulatorParameters", addParams), hexId, this.api.registry.createType("DidSignature", signature.toJSON()));
  }

  createNewPublicKeyTx(addPk, did, keyPair = undefined, signature = undefined) {
    const hexId = this.api.registry.createType("Did", getHexIdentifierFromDID(did));
    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to register new key.');
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signAddPublicKey(keyPair, addPk);
    }
    return this.module.addPublicKey(this.api.registry.createType("AccumulatorPublicKey", addPk), hexId, this.api.registry.createType("DidSignature", signature.toJSON()));
  }

  removeParamsTx(did, counter, keyPair = undefined, signature = undefined) {
    const hexId = this.api.registry.createType("Did", getHexIdentifierFromDID(did));
    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to remove params.');
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signRemoveParams(keyPair, [hexId, counter]);
    }
    return this.module.removeParams([hexId, counter], this.api.registry.createType("DidSignature", signature.toJSON()));
  }

  removePublicKeyTx(did, counter, keyPair = undefined, signature = undefined) {
    const hexId = this.api.registry.createType("Did", getHexIdentifierFromDID(did));
    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to remove public key.');
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signRemovePublicKey(keyPair, [hexId, counter]);
    }
    return this.module.removePublicKey([hexId, counter], this.api.registry.createType("DidSignature", signature.toJSON()));
  }

  async createNewParams(addParams, did, keyPair = undefined, signature = undefined, waitForFinalization = true, params = {}) {
    const tx = this.createNewParamsTx(addParams, did, keyPair, signature);
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createNewPublicKey(addPublicKey, did, keyPair = undefined, signature = undefined, waitForFinalization = true, params = {}) {
    const tx = this.createNewPublicKeyTx(addPublicKey, did, keyPair, signature);
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async removeParams(did, counter, keyPair = undefined, signature = undefined, waitForFinalization = true, params = {}) {
    const tx = this.removeParamsTx(did, counter, keyPair, signature);
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async removePublicKey(did, counter, keyPair = undefined, signature = undefined, waitForFinalization = true, params = {}) {
    const tx = this.removePublicKeyTx(did, counter, keyPair, signature);
    return this.signAndSend(tx, waitForFinalization, params);
  }

  // eslint-disable-next-line no-unused-vars
  async queryParamsFromChain(hexDid, counter) {
    throw new Error('Extending class should implement queryParamsFromChain');
  }

  // eslint-disable-next-line no-unused-vars
  async queryPublicKeyFromChain(hexDid, counter) {
    throw new Error('Extending class should implement queryPublicKeyFromChain');
  }

  async getParams(did, counter) {
    const hexId = getHexIdentifierFromDID(did);
    return this.getParamsByHexDid(hexId, counter);
  }

  /**
   *
   * @param did
   * @param counter
   * @param withParams - If true, return the params referenced by the public key. It will throw an error if params_ref is null
   * or params were not found on chain which can happen if they were deleted after this public key was added.
   * @returns {Promise<{bytes: string}|null>}
   */
  async getPublicKey(did, counter, withParams = false) {
    const hexId = getHexIdentifierFromDID(did);
    return this.getPublicKeyByHexDid(hexId, counter, withParams);
  }

  async getParamsByHexDid(hexDid, counter) {
    const resp = await this.queryParamsFromChain(hexDid, counter);
    if (resp.isSome) {
      return this.createParamsObjFromChainResponse(resp.unwrap());
    }
    return null;
  }

  async getPublicKeyByHexDid(hexDid, counter, withParams = false) {
    const resp = await this.queryPublicKeyFromChain(hexDid, counter);
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
   * Get all params written by a DID
   * @param did
   * @returns {Promise<object[]>}
   */
  async getAllParamsByDid(did) {
    const hexId = getHexIdentifierFromDID(did);

    // TODO: Figure out why this doesn't work
    /* const d = this.api.createType('Did', hexToU8a(hexId));
    const resp = await this.api.rpc.core_mods.bbsPlusParamsByDid(d);
    if (resp.isOk) {
      return resp.unwrap();
    }
    return null; */

    const params = [];
    const [counter] = await this.api.query[this.moduleName].didCounters(hexId);
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

  /**
   * Get all public keys written by a DID
   * @param did
   * @param withParams
   * @returns {Promise< object[]>}
   */
  async getAllPublicKeysByDid(did, withParams = false) {
    const hexId = getHexIdentifierFromDID(did);

    const pks = [];
    const [, counter] = await this.api.query[this.moduleName].didCounters(this.api.registry.createType("Did", hexId));
    if (counter > 0) {
      for (let i = 1; i <= counter; i++) {
        // eslint-disable-next-line no-await-in-loop
        const pk = await this.getPublicKeyByHexDid(hexId, i, withParams);
        if (pk !== null) {
          pks.push(pk);
        }
      }
    }
    return pks;
  }

  /**
   * Format an object received from the chain as a params object with keys `bytes`, `label` and `curveType`.
   * @param params
   * @returns {{bytes: string}}
   */
  createParamsObjFromChainResponse(params) {
    const paramsObj = {
      bytes: u8aToHex(params.bytes),
    };
    if (params.curveType.isBls12381) {
      paramsObj.curveType = 'Bls12381';
      paramsObj.curve_type = 'Bls12381'
    }
    if (params.label.isSome) {
      paramsObj.label = u8aToHex(params.label.unwrap());
    } else {
      paramsObj.label = null;
    }
    return paramsObj;
  }

  /**
   * Format an object received from the chain as a public key object with keys `bytes`, ` params_ref` and `curveType`.
   * @param pk
   * @returns {{bytes: string}}
   */
  createPublicKeyObjFromChainResponse(pk) {
    const pkObj = {
      bytes: u8aToHex(pk.bytes),
    };
    if (pk.curveType.isBls12381) {
      pkObj.curveType = 'Bls12381';
    }
    if (pk.paramsRef.isSome) {
      const pr = pk.paramsRef.unwrap();
      pkObj.params_ref = [u8aToHex(pr[0]), pr[1].toNumber()];
    } else {
      pkObj.params_ref = null
    }
    return pkObj;
  }

  /**
   * Get last params written by this DID
   * @param did
   * @returns {Promise<{bytes: string}|null>}
   */
  async getLastParamsWritten(did) {
    const hexId = getHexIdentifierFromDID(did);
    const [counter] = await this.api.query[this.moduleName].didCounters(hexId);
    if (counter > 0) {
      const resp = await this.queryParamsFromChain(hexId, counter);
      if (resp.isSome) {
        return this.createParamsObjFromChainResponse(resp.unwrap());
      }
    }
    return null;
  }

  /**
   * Get last public key written by this DID
   * @param did
   * @returns {Promise<{bytes: string}|null>}
   */
  async getLastPublicKeyWritten(did) {
    const hexId = getHexIdentifierFromDID(did);
    const [, counter] = await this.api.query[this.moduleName].didCounters(this.api.registry.createType("Did", hexId));
    if (counter > 0) {
      const resp = await this.queryPublicKeyFromChain(hexId, counter);
      if (resp.isSome) {
        return this.createPublicKeyObjFromChainResponse(resp.unwrap());
      }
    }
    return null;
  }

  // eslint-disable-next-line no-unused-vars
  signAddParams(keyPair, params) {
    throw new Error('Extending class should implement signAddParams');
  }

  // eslint-disable-next-line no-unused-vars
  signAddPublicKey(keyPair, pk) {
    throw new Error('Extending class should implement signAddPublicKey');
  }

  // eslint-disable-next-line no-unused-vars
  signRemoveParams(keyPair, ref) {
    throw new Error('Extending class should implement signRemoveParams');
  }

  // eslint-disable-next-line no-unused-vars
  signRemovePublicKey(keyPair, ref) {
    throw new Error('Extending class should implement signRemovePublicKey');
  }
}
