/* eslint-disable camelcase */

import { isHex, u8aToHex } from '@polkadot/util';
import { getDidNonce, getStateChange } from '../utils/misc';
import WithParamsAndPublicKeys from './WithParamsAndPublicKeys';
import { getAllExtrinsicsFromBlock } from '../utils/chain-ops';
import { createDidSig, typedHexDID } from '../utils/did';

/** Class to manage accumulators on chain */
export default class AccumulatorModule extends WithParamsAndPublicKeys {
  constructor(api, signAndSend) {
    super();
    this.api = api;
    this.moduleName = 'accumulator';
    this.module = api.tx[this.moduleName];
    this.signAndSend = signAndSend;
  }

  static prepareAddPositiveAccumulator(api, id, accumulated, publicKeyRef) {
    const keyRef = AccumulatorModule.parseRef(api, publicKeyRef);
    return {
      id,
      accumulator: {
        Positive: {
          accumulated,
          keyRef,
        },
      },
    };
  }

  static prepareAddUniversalAccumulator(
    api,
    id,
    accumulated,
    publicKeyRef,
    maxSize,
  ) {
    const keyRef = AccumulatorModule.parseRef(api, publicKeyRef);
    return {
      id,
      accumulator: {
        Universal: {
          common: {
            accumulated,
            keyRef,
          },
          maxSize,
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
    if (
      event.section === 'accumulator'
      && event.method === 'AccumulatorUpdated'
    ) {
      return [u8aToHex(event.data[0]), u8aToHex(event.data[1])];
    }
    return null;
  }

  /**
   * Create transaction to add accumulator public key
   * @param publicKey - Accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddPublicKeyTx(
    publicKey,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [addPk, signature] = await this.createSignedAddPublicKey(
      publicKey,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.addPublicKey(addPk, signature);
  }

  /**
   * Create transaction to remove accumulator public key
   * @param removeKeyId - Index of the accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createRemovePublicKeyTx(
    removeKeyId,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [remPk, signature] = await this.createSignedRemovePublicKey(
      removeKeyId,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.removePublicKey(remPk, signature);
  }

  /**
   * Create a transaction to add positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddPositiveAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [addAccumulator, signature] = await this.createSignedAddPositiveAccumulator(
      id,
      accumulated,
      publicKeyRef,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.addAccumulator(addAccumulator, signature);
  }

  /**
   * Create a transaction to add universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key
   * @param maxSize - Maximum size of the accumulator
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createAddUniversalAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [addAccumulator, signature] = await this.createSignedAddUniversalAccumulator(
      id,
      accumulated,
      publicKeyRef,
      maxSize,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.addAccumulator(addAccumulator, signature);
  }

  /**
   * Create a transaction to update accumulator
   * @param id - Unique accumulator id
   * @param newAccumulated - Accumulated value after the update
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<object>}
   */
  async updateAccumulatorTx(
    id,
    newAccumulated,
    {
      additions = undefined,
      removals = undefined,
      witnessUpdateInfo = undefined,
    },
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [update, signature] = await this.createSignedUpdateAccumulator(
      id,
      newAccumulated,
      { additions, removals, witnessUpdateInfo },
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.updateAccumulator(update, signature);
  }

  /**
   * Create transaction to remove accumulator
   * @param id - id to remove
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<object>}
   */
  async removeAccumulatorTx(
    id,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    const signerHexDid = typedHexDID(this.api, signerDid);
    const [removal, signature] = await this.createSignedRemoveAccumulator(
      id,
      signerHexDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.module.removeAccumulator(removal, signature);
  }

  /**
   * Add accumulator public key
   * @param publicKey - Accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addPublicKey(
    publicKey,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddPublicKeyTx(
      publicKey,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove a public key
   * @param removeKeyId - Index of the accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removePublicKey(
    removeKeyId,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemovePublicKeyTx(
      removeKeyId,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Add a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addPositiveAccumulator(
    id,
    accumulated,
    publicKeyRef,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddPositiveAccumulatorTx(
      id,
      accumulated,
      publicKeyRef,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Add universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key
   * @param maxSize - Maximum size of the accumulator
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addUniversalAccumulator(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddUniversalAccumulatorTx(
      id,
      accumulated,
      publicKeyRef,
      maxSize,
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Update existing accumulator
   * @param id
   * @param newAccumulated - Accumulated value after the update
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise< object>}
   */
  async updateAccumulator(
    id,
    newAccumulated,
    {
      additions = undefined,
      removals = undefined,
      witnessUpdateInfo = undefined,
    },
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.updateAccumulatorTx(
      id,
      newAccumulated,
      { additions, removals, witnessUpdateInfo },
      signerDid,
      signingKeyRef,
      { nonce, didModule },
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id - id to remove
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeAccumulator(
    id,
    signerDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.removeAccumulatorTx(id, signerDid, signingKeyRef, {
      nonce,
      didModule,
    });
    return this.signAndSend(tx, waitForFinalization, params);
  }

  async createSignedAddPublicKey(
    publicKey,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const addPk = { publicKey, nonce };
    const signature = this.signAddPublicKey(signingKeyRef, addPk);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [addPk, didSig];
  }

  async createSignedRemovePublicKey(
    removeKeyId,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const removeKey = { keyRef: [signerHexDid, removeKeyId], nonce };
    const signature = this.signRemovePublicKey(signingKeyRef, removeKey);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [removeKey, didSig];
  }

  async createSignedAddPositiveAccumulator(
    id,
    accumulated,
    publicKeyRef,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const accum = AccumulatorModule.prepareAddPositiveAccumulator(
      this.api,
      id,
      accumulated,
      publicKeyRef,
    );
    const addAccum = { ...accum, nonce };
    const signature = this.signAddAccumulator(signingKeyRef, addAccum);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [addAccum, didSig];
  }

  async createSignedAddUniversalAccumulator(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const accum = AccumulatorModule.prepareAddUniversalAccumulator(
      this.api,
      id,
      accumulated,
      publicKeyRef,
      maxSize,
    );
    const addAccum = { ...accum, nonce };
    const signature = this.signAddAccumulator(signingKeyRef, addAccum);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [addAccum, didSig];
  }

  async createSignedUpdateAccumulator(
    id,
    newAccumulated,
    {
      additions = undefined,
      removals = undefined,
      witnessUpdateInfo = undefined,
    },
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
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
    const signature = this.signUpdateAccumulator(signingKeyRef, updateAccum);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [updateAccum, didSig];
  }

  async createSignedRemoveAccumulator(
    id,
    signerHexDid,
    signingKeyRef,
    { nonce = undefined, didModule = undefined },
  ) {
    // eslint-disable-next-line no-param-reassign
    nonce = await getDidNonce(signerHexDid, nonce, didModule);
    const remAccum = { id, nonce };
    const signature = this.signRemoveAccumulator(signingKeyRef, remAccum);
    const didSig = createDidSig(signerHexDid, signingKeyRef, signature);
    return [remAccum, didSig];
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param withKeyAndParams - Fetch both keys and params.
   * @param withKeyOnly - Fetch key only. This is useful when default params are used.
   * @returns {Promise<{created: *, lastModified: *}|null>}
   */
  async getAccumulator(id, withKeyAndParams = false, withKeyOnly = false) {
    const resp = await this.api.query[this.moduleName].accumulators(id);
    if (resp.isSome) {
      const accumInfo = resp.unwrap();
      const accumulatorObj = {
        created: accumInfo.createdAt.toNumber(),
        lastModified: accumInfo.lastUpdatedAt.toNumber(),
      };
      let common;
      if (accumInfo.accumulator.isPositive) {
        accumulatorObj.type = 'positive';
        common = accumInfo.accumulator.asPositive;
      } else {
        accumulatorObj.type = 'universal';
        common = accumInfo.accumulator.asUniversal.common;
        accumulatorObj.maxSize = accumInfo.accumulator.asUniversal.maxSize.toNumber();
      }
      accumulatorObj.accumulated = u8aToHex(common.accumulated);
      const owner = common.keyRef[0];
      const keyId = common.keyRef[1].toNumber();
      accumulatorObj.keyRef = [typedHexDID(this.api, owner), keyId];

      if (withKeyAndParams || withKeyOnly) {
        const pk = await this.getPublicKeyByHexDid(
          owner,
          keyId,
          withKeyAndParams,
        );
        if (pk !== null) {
          accumulatorObj.publicKey = pk;
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
   * `newAccumulated`, `additions`, `removals` and `witnessUpdateInfo`. The last keys have value null if they were
   * not provided in the extrinsic.
   */
  async getUpdatesFromBlock(accumulatorId, blockNoOrBlockHash) {
    const extrinsics = await getAllExtrinsicsFromBlock(
      this.api,
      blockNoOrBlockHash,
      false,
    );
    const updates = [];
    extrinsics.forEach((ext) => {
      if (
        ext.method
        && ext.method.section === 'accumulator'
        && ext.method.method === 'updateAccumulator'
      ) {
        const update = this.api.createType(
          'UpdateAccumulator',
          ext.method.args[0],
        );
        if (u8aToHex(update.id) === accumulatorId) {
          // The following commented line produces truncated hex strings. Don't know why
          // const additions = update.additions.isSome ? update.additions.unwrap().map(u8aToHex) : null;
          const additions = update.additions.isSome
            ? update.additions.unwrap().map((i) => u8aToHex(i))
            : null;
          const removals = update.removals.isSome
            ? update.removals.unwrap().map((i) => u8aToHex(i))
            : null;
          const witnessUpdateInfo = update.witnessUpdateInfo.isSome
            ? u8aToHex(update.witnessUpdateInfo.unwrap())
            : null;

          updates.push({
            newAccumulated: u8aToHex(update.newAccumulated),
            additions,
            removals,
            witnessUpdateInfo,
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
    const hexId = typedHexDID(this.api, did);

    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.paramsCounter.toNumber();
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
    const hexId = typedHexDID(this.api, did);

    const params = [];
    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.paramsCounter.toNumber();
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
    const hexId = typedHexDID(this.api, did);

    const pks = [];
    const counters = await this.api.query[this.moduleName].accumulatorOwnerCounters(hexId);
    const counter = counters.keyCounter.toNumber();
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
    const params = await this.api.query[this.moduleName].accumulatorParams(
      hexDid,
      counter,
    );

    if (params.isSome) {
      return params.unwrap();
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, counter) {
    const key = await this.api.query[this.moduleName].accumulatorKeys(
      hexDid,
      counter,
    );

    if (key.isSome) {
      return key.unwrap();
    } else {
      return null;
    }
  }

  signAddParams(signingKeyRef, params) {
    const serialized = getStateChange(this.api, 'AddAccumulatorParams', params);
    return signingKeyRef.sign(serialized);
  }

  signAddPublicKey(signingKeyRef, pk) {
    const serialized = getStateChange(this.api, 'AddAccumulatorPublicKey', pk);
    return signingKeyRef.sign(serialized);
  }

  signRemoveParams(signingKeyRef, ref) {
    const serialized = getStateChange(this.api, 'RemoveAccumulatorParams', ref);
    return signingKeyRef.sign(serialized);
  }

  signRemovePublicKey(signingKeyRef, ref) {
    const serialized = getStateChange(
      this.api,
      'RemoveAccumulatorPublicKey',
      ref,
    );
    return signingKeyRef.sign(serialized);
  }

  signAddAccumulator(signingKeyRef, addAccumulator) {
    const serialized = getStateChange(
      this.api,
      'AddAccumulator',
      addAccumulator,
    );
    return signingKeyRef.sign(serialized);
  }

  signUpdateAccumulator(signingKeyRef, update) {
    const serialized = getStateChange(this.api, 'UpdateAccumulator', update);
    return signingKeyRef.sign(serialized);
  }

  signRemoveAccumulator(signingKeyRef, removal) {
    const serialized = getStateChange(this.api, 'RemoveAccumulator', removal);
    return signingKeyRef.sign(serialized);
  }
}
