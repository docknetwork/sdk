/* eslint-disable camelcase */

import { isHex, u8aToHex } from '@polkadot/util';
import { getNonce, getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import WithParamsAndPublicKeys from './WithParamsAndPublicKeys';
import { getAllExtrinsicsFromBlock } from '../utils/chain-ops';
import { createDidSig, getHexIdentifierFromDID } from '../utils/did';

/** Class to manage accumulators on chain */
export default class AccumulatorModule extends WithParamsAndPublicKeys {
  constructor(api, signAndSend) {
    super();
    this.api = api;
    this.moduleName = 'accumulator';
    this.module = api.tx[this.moduleName];
    this.signAndSend = signAndSend;
  }

  static prepareAddPositiveAccumulator(id, accumulated, publicKeyRef) {
    const [hexDid, counter] = this.parseRef(publicKeyRef);
    return {
      id,
      accumulator: {
        Positive: {
          accumulated,
          key_ref: [hexDid, counter],
        },
      },
    };
  }

  static prepareAddUniversalAccumulator(id, accumulated, publicKeyRef, maxSize) {
    const [hexDid, counter] = this.parseRef(publicKeyRef);
    return {
      id,
      accumulator: {
        Universal: {
          common: {
            accumulated,
            key_ref: [hexDid, counter],
          },
          max_size: maxSize,
        },
      },
    };
  }

  static ensureArrayOfBytearrays(arr) {
    if (!(typeof arr === 'object' && arr instanceof Array)) {
      throw new Error(`Require an array but got ${arr}`);
    }
    for (let i = 0; i < arr.length; i++) {
      if (!isHex(arr[i])) {
        throw new Error(`Require a hex string but got ${arr[0]}`);
      }
    }
  }

  /**
   * Accepts an event and returns the accumulator id and accumulated value if the event was
   * `accumulator:AccumulatorUpdated`
   * @param event - The event. This is the `event` key in the `event` object, i.e. for the `event` object got in response
   * of `api.query.system.events`, the argument to this function is `event.event`.
   * @returns {null|string[]} - null if the event is not `accumulator:AccumulatorUpdated` else [accumulatorId, accumulated]
   */
  static parseEventAsAccumulatorUpdate(event) {
    if (event.section === 'accumulator' && event.method === 'AccumulatorUpdated') {
      return [u8aToHex(event.data[0][0]), u8aToHex(event.data[1])];
    }
    return null;
  }

  async createAddPublicKeyTx(publicKey, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addPk, signature] = await this.createSignedAddPublicKey(publicKey, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addPublicKey(addPk, signature);
  }

  async createRemovePublicKeyTx(removeKeyId, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [remPk, signature] = await this.createSignedRemovePublicKey(removeKeyId, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.removePublicKey(remPk, signature);
  }

  async createAddPositiveAccumulatorTx(id, accumulated, publicKeyRef, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addAccumulator, signature] = await this.createSignedAddPositiveAccumulator(id, accumulated, publicKeyRef, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addAccumulator(addAccumulator, signature);
  }

  async createAddUniversalAccumulatorTx(id, accumulated, publicKeyRef, maxSize, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addAccumulator, signature] = await this.createSignedAddUniversalAccumulator(id, accumulated, publicKeyRef, maxSize, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.addAccumulator(addAccumulator, signature);
  }

  /**
   *
   * @param id
   * @param newAccumulated
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e. the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @returns {Promise<object>}
   */
  async updateAccumulatorTx(
    id, newAccumulated,
    { additions = undefined, removals = undefined, witnessUpdateInfo = undefined }, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [update, signature] = await this.createSignedUpdateAccumulator(id, newAccumulated,
      { additions, removals, witnessUpdateInfo }, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.updateAccumulator(update, signature);
  }

  /**
   *
   * @param id
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e. the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @returns {Promise<object>}
   */
  async removeAccumulatorTx(id, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removal, signature] = await this.createSignedRemoveAccumulator(id, signerHexDid, keyPair, keyId, { nonce, didModule });
    return this.module.removeAccumulator(removal, signature);
  }

  async addPublicKey(publicKey, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddPublicKeyTx(publicKey, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async removePublicKey(removeKeyId, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createRemovePublicKeyTx(removeKeyId, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async addPositiveAccumulator(id, accumulated, publicKeyRef, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddPositiveAccumulatorTx(id, accumulated, publicKeyRef, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async addUniversalAccumulator(id, accumulated, publicKeyRef, maxSize, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.createAddUniversalAccumulatorTx(id, accumulated, publicKeyRef, maxSize, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Update existing accumulator
   * @param id
   * @param newAccumulated
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @param waitForFinalization
   * @param params
   * @returns {Promise< object>}
   */
  async updateAccumulator(id, newAccumulated,
    { additions = undefined, removals = undefined, witnessUpdateInfo = undefined }, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.updateAccumulatorTx(id, newAccumulated,
      { additions, removals, witnessUpdateInfo }, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeAccumulator(id, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const tx = await this.removeAccumulatorTx(id, signerDid, keyPair, keyId, { nonce, didModule });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createSignedAddPublicKey(publicKey, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const addPk = { public_key: publicKey, nonce };
    const signature = this.signAddPublicKey(keyPair, addPk);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [addPk, didSig];
  }

  async createSignedRemovePublicKey(removeKeyId, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const removeKey = { key_ref: [{ 0: signerHexDid }, { 0: removeKeyId }], nonce };
    const signature = this.signRemovePublicKey(keyPair, removeKey);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [removeKey, didSig];
  }

  async createSignedAddPositiveAccumulator(id, accumulated, publicKeyRef, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const accum = AccumulatorModule.prepareAddPositiveAccumulator(id, accumulated, publicKeyRef);
    const addAccum = { ...accum, nonce };
    const signature = this.signAddAccumulator(keyPair, addAccum);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [addAccum, didSig];
  }

  async createSignedAddUniversalAccumulator(id, accumulated, publicKeyRef, maxSize, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const accum = AccumulatorModule.prepareAddUniversalAccumulator(id, accumulated, publicKeyRef, maxSize);
    const addAccum = { ...accum, nonce };
    const signature = this.signAddAccumulator(keyPair, addAccum);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [addAccum, didSig];
  }

  async createSignedUpdateAccumulator(id, newAccumulated,
    { additions = undefined, removals = undefined, witnessUpdateInfo = undefined }, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    if (additions !== undefined) {
      AccumulatorModule.ensureArrayOfBytearrays(additions);
    }
    if (removals !== undefined) {
      AccumulatorModule.ensureArrayOfBytearrays(removals);
    }
    if (witnessUpdateInfo !== undefined && !isHex(witnessUpdateInfo)) {
      throw new Error(`Require a hex string but got ${witnessUpdateInfo}`);
    }
    const updateAccum = {
      id,
      new_accumulated: newAccumulated,
      additions,
      removals,
      witness_update_info: witnessUpdateInfo,
      nonce,
    };
    const signature = this.signUpdateAccumulator(keyPair, updateAccum);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [updateAccum, didSig];
  }

  async createSignedRemoveAccumulator(id, signerHexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(signerHexDid, nonce, didModule);
    const remAccum = { id, nonce };
    const signature = this.signRemoveAccumulator(keyPair, remAccum);
    const didSig = createDidSig(signerHexDid, keyId, signature);
    return [remAccum, didSig];
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param withKeyAndParams
   * @returns {Promise<{created: *, lastModified: *}|null>}
   */
  async getAccumulator(id, withKeyAndParams = false) {
    const resp = await this.api.query[this.moduleName].accumulators(id);
    if (resp.isSome) {
      const accumInfo = resp.unwrap();
      const accumulatorObj = {
        created: accumInfo.created_at.toNumber(), lastModified: accumInfo.last_updated_at.toNumber(),
      };
      let common;
      if (accumInfo.accumulator.isPositive) {
        accumulatorObj.type = 'positive';
        common = accumInfo.accumulator.asPositive;
      } else {
        accumulatorObj.type = 'universal';
        common = accumInfo.accumulator.asUniversal.common;
        accumulatorObj.max_size = accumInfo.accumulator.asUniversal.max_size.toNumber();
      }
      accumulatorObj.accumulated = u8aToHex(common.accumulated);
      const owner = u8aToHex(common.key_ref[0][0][0]);
      const keyId = common.key_ref[1][0].toNumber();
      accumulatorObj.key_ref = [owner, keyId];

      if (withKeyAndParams) {
        const pk = await this.getPublicKeyByHexDid(owner, keyId, true);
        if (pk !== null) {
          accumulatorObj.public_key = pk;
        }
      }
      return accumulatorObj;
    }
    return null;
  }

  /**
   * Fetch a block and get all accumulator updates made in that block's extrinsics corresponding to accumulator id `accumulatorId`
   * @param accumulatorId
   * @param blockNoOrBlockHash
   * @returns {Promise<object[]>} - Resolves to an array of `update`s where each `update` is an object with keys
   * `new_accumulated`, `additions`, `removals` and `witness_update_info`. The last keys have value null if they were
   * not provided in the extrinsic.
   */
  async getUpdatesFromBlock(accumulatorId, blockNoOrBlockHash) {
    const extrinsics = await getAllExtrinsicsFromBlock(this.api, blockNoOrBlockHash, false);
    const updates = [];
    extrinsics.forEach((ext) => {
      if (ext.method && (ext.method.section === 'accumulator') && (ext.method.method === 'updateAccumulator')) {
        const update = this.api.createType('UpdateAccumulator', ext.method.args[0]);
        if (u8aToHex(update.id[0]) === accumulatorId) {
          // The following commented line produces truncated hex strings. Don't know why
          // const additions = update.additions.isSome ? update.additions.unwrap().map(u8aToHex) : null;
          const additions = update.additions.isSome ? update.additions.unwrap().map((i) => u8aToHex(i)) : null;
          const removals = update.removals.isSome ? update.removals.unwrap().map((i) => u8aToHex(i)) : null;
          const witness_update_info = update.witness_update_info.isSome ? u8aToHex(update.witness_update_info.unwrap()) : null;
          updates.push({
            new_accumulated: u8aToHex(update.new_accumulated),
            additions,
            removals,
            witness_update_info,
          });
        }
      }
    });
    return updates;
  }

  /**
   * Get last params written by this DID
   * @param did
   * @returns {Promise<{bytes: string}|null>}
   */
  async getLastParamsWritten(did) {
    const hexId = getHexIdentifierFromDID(did);
    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.params_counter[0].toNumber();
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
    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.params_counter[0].toNumber();
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
    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.key_counter[0].toNumber();
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

  async queryParamsFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].accumulatorParams(hexDid, { 0: counter });
  }

  async queryPublicKeyFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].accumulatorKeys(hexDid, { 0: counter });
  }

  signAddParams(keyPair, params) {
    const serialized = getStateChange(this.api, 'AddAccumulatorParams', params);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signAddPublicKey(keyPair, pk) {
    const serialized = getStateChange(this.api, 'AddAccumulatorPublicKey', pk);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemoveParams(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveAccumulatorParams', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemovePublicKey(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveAccumulatorPublicKey', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signAddAccumulator(keyPair, addAccumulator) {
    const serialized = getStateChange(this.api, 'AddAccumulator', addAccumulator);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signUpdateAccumulator(keyPair, update) {
    const serialized = getStateChange(this.api, 'UpdateAccumulator', update);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemoveAccumulator(keyPair, removal) {
    const serialized = getStateChange(this.api, 'RemoveAccumulator', removal);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }
}
