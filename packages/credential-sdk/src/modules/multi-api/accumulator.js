import { AbstractAccumulatorModule } from '../abstract';
import { AccumulatorId, NamespaceDid } from '../../types';
import { injectModuleRouter } from './common';

export default class MultiApiAccumulatorModule extends injectModuleRouter(
  AbstractAccumulatorModule,
) {
  /**
   * Adds a public key associated with a target DID for cryptographic operations.
   * This method allows you to store or update a public key within an accumulator module,
   * which can be used in various cryptographic accumulations and verifications.
   *
   * @param {*} id - Unique identifier for the public key entry
   * @param {*} publicKey - The public key value being added/updated
   * @param {*} targetDid - DID that will control this public key
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @param {object} [params] - Optional parameters for additional configuration
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async addPublicKey(id, publicKey, targetDid, didKeypair, params) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).addPublicKey(
      id,
      publicKey,
      did,
      didKeypair,
      params,
    );
  }

  /**
   * Creates and stores a new accumulator on the blockchain
   *
   * An accumulator is a cryptographic data structure used to maintain an aggregate value that can be updated incrementally.
   * This method creates a new accumulator instance with the given ID and initial state.
   *
   * @param {string} id - Unique identifier for the accumulator
   * @param {Accumulator} accumulator - Initial accumulator value to store
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async addAccumulator(id, accumulator, didKeypair, params) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addAccumulator(
      id,
      accumulator,
      didKeypair,
      params,
    );
  }

  /**
   * Add a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addPositiveAccumulator(
    id,
    accumulated,
    publicKeyRef,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addPositiveAccumulator(
      accId,
      accumulated,
      publicKeyRef,
      didKeypair,
      params,
    );
  }

  /**
   * Add universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param maxSize - Maximum size of the accumulator
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addUniversalAccumulator(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addUniversalAccumulator(
      accId,
      accumulated,
      publicKeyRef,
      maxSize,
      didKeypair,
      params,
    );
  }

  /**
   * Add KB universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addKBUniversalAccumulator(
    id,
    accumulated,
    publicKeyRef,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addKBUniversalAccumulator(
      accId,
      accumulated,
      publicKeyRef,
      didKeypair,
      params,
    );
  }

  /**
   * Update existing a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param {{ additions: Array<Uint8Array>, removals: Array<Uint8Array>, witnessUpdateInfo: Uint8Array }} updates
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async updatePositiveAccumulator(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    publicKeyRef,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).updatePositiveAccumulator(
      accId,
      accumulated,
      { additions, removals, witnessUpdateInfo },
      publicKeyRef,
      didKeypair,
      params,
    );
  }

  /**
   * Update existing universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param maxSize - Maximum size of the accumulator
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async updateUniversalAccumulator(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    publicKeyRef,
    maxSize,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).updateUniversalAccumulator(
      accId,
      accumulated,
      { additions, removals, witnessUpdateInfo },
      publicKeyRef,
      maxSize,
      didKeypair,
      params,
    );
  }

  /**
   * Update existing KB universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async updateKBUniversalAccumulator(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    publicKeyRef,
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).updateKBUniversalAccumulator(
      accId,
      accumulated,
      { additions, removals, witnessUpdateInfo },
      publicKeyRef,
      didKeypair,
      params,
    );
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id - id to remove
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeAccumulator(id, didKeypair, params) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).removeAccumulator(
      id,
      didKeypair,
      params,
    );
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param includeKey - Fetch public key for the given accumulator.
   * @param includeKeyParams - Fetch public key params.
   * @returns {Promise<Accumulator|null>}
   */
  async getAccumulator(id, includeKey = false, includeKeyParams = false) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).getAccumulator(
      accId,
      includeKey,
      includeKeyParams,
    );
  }

  /**
   * Update given witness by downloading necessary accumulators (blocks) and applying the updates if found.
   * **Both `from` and `to` are inclusive.**
   *
   * @param accumulatorId
   * @param member
   * @param witness - this will be updated to the latest witness
   * @param from - identifier to start from (block number or collection item id)
   * @param to - identifier to end in (block number or collection item id)
   * @returns {Promise<void>}
   */
  async updateWitness(accumulatorId, member, witness, from, to) {
    const accId = AccumulatorId.from(accumulatorId);

    return await this.moduleById(accId).updateWitness(
      accId,
      member,
      witness,
      from,
      to,
    );
  }

  async getPublicKey(did, id, includeParams) {
    const parsedDid = NamespaceDid.from(did);

    return await this.moduleById(parsedDid).getPublicKey(
      parsedDid,
      id,
      includeParams,
    );
  }

  /**
   * Retrieves all accumulator public keys by a DID.
   * @param {*} did
   * @returns {Promise<Map<*, AccumulatorPublicKey>>}
   */
  async getAllPublicKeysByDid(did, includeParams) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getAllPublicKeysByDid(did, includeParams);
  }

  async addPublicKeyTx(...args) {
    const did = NamespaceDid.from(args[2]);

    return await this.moduleById(did).addPublicKeyTx(...args);
  }

  /**
   * Remove public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signing key reference
   * @returns {Promise<*>}
   */
  async removePublicKeyTx(...args) {
    const did = NamespaceDid.from(args[1]);

    return await this.moduleById(did).removePublicKeyTx(...args);
  }

  /**
   * Retrieves accumulator params by a DID and unique idetnfier.
   * @param {*} did
   * @param {*} id
   * @returns {Promise<AccumulatorParams>}
   */
  async getParams(did, id) {
    const parsedDid = NamespaceDid.from(did);

    return await this.moduleById(parsedDid).getParams(parsedDid, id);
  }

  /**
   * Retrieves all accumulator params by a DID.
   * @param {*} did
   * @returns {Promise<Map<*, AccumulatorParams>>}
   */
  async getAllParamsByDid(did) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getAllParamsByDid(did);
  }

  /**
   * Add new accumulator params.
   * @param id - Unique identifier of the new params to be added.
   * @param param - The signature params to add.
   * @param targetDid
   * @param keyPair - Signer's keypair

   * @returns {Promise<*>}
   */
  async addParams(...args) {
    const did = NamespaceDid.from(args[2]);

    return await this.moduleById(did).addParams(...args);
  }

  async addParamsTx(...args) {
    const did = NamespaceDid.from(args[2]);

    return await this.moduleById(did).addParamsTx(...args);
  }

  /**
   * Creates and stores a new accumulator on the blockchain
   *
   * An accumulator is a cryptographic data structure used to maintain an aggregate value that can be updated incrementally.
   * This method creates a new accumulator instance with the given ID and initial state.
   *
   * @param {string} id - Unique identifier for the accumulator
   * @param {Accumulator} accumulator - Initial accumulator value to store
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async addAccumulatorTx(id, accumulator, didKeypair) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addAccumulatorTx(
      id,
      accumulator,
      didKeypair,
    );
  }

  /**
   * Updates an existing accumulator on the blockchain
   *
   * This method replaces the current state of an accumulator with a new value.
   * The accumulator must already exist (be previously created) to be updated.
   *
   * @param {string} id - Unique identifier of the accumulator to update
   * @param {AccumulatorValue} accumulator - New accumulator value to set
   * @param {{ additions: Array<Uint8Array>, removals: Array<Uint8Array>, witnessUpdateInfo: Uint8Array }} updates
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async updateAccumulatorTx(
    id,
    accumulator,
    { additions, removals, witnessUpdateInfo },
    didKeypair,
  ) {
    return await this.cheqdOnly.tx.updateAccumulator(
      id,
      accumulator,
      { additions, removals, witnessUpdateInfo },
      didKeypair,
    );
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id - id to remove
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeAccumulatorTx(id, didKeypair) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).removeAccumulatorTx(accId, didKeypair);
  }

  async lastPublicKeyId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).lastPublicKeyId(did);
  }

  async nextPublicKeyId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).nextPublicKeyId(did);
  }

  async lastParamsId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).lastParamsId(did);
  }

  async nextParamsId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).nextParamsId(did);
  }

  async accumulatorHistory(id) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).accumulatorHistory(accId);
  }

  async accumulatorVersions(id) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).accumulatorVersions(accId);
  }
}
