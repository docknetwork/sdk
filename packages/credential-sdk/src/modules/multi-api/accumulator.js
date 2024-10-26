import { AbstractAccumulatorModule } from '../abstract';
import { AccumulatorId, NamespaceDid } from '../../types';
import { injectDispatch } from './common';

export default class MultiApiAccumulatorModule extends injectDispatch(
  AbstractAccumulatorModule,
) {
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
   * Remove public key
   * @param removeKeyId - The key index for key to remove.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signing key reference
   * @returns {Promise<*>}
   */
  async removePublicKey(removeKeyId, targetDid, didKeypair, params) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).removePublicKey(
      removeKeyId,
      did,
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
   * Update existing accumulator
   * @param id
   * @param newAccumulated - Accumulated value after the update
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise< object>}
   */
  async updateAccumulator(
    id,
    newAccumulated,
    { additions, removals, witnessUpdateInfo },
    didKeypair,
    params,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).updateAccumulator(
      accId,
      newAccumulated,
      { additions, removals, witnessUpdateInfo },
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
    return await this.moduleById(AccumulatorId.from(id)).getAccumulator(
      id,
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

    return await this.moduleById(accId).getAccumulator(
      accId,
      member,
      witness,
      from,
      to,
    );
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

  async addParams(...args) {
    const did = NamespaceDid.from(args[2]);

    return await this.moduleById(did).addParamsTx(...args);
  }

  async addParamsTx(...args) {
    const did = NamespaceDid.from(args[2]);

    return await this.moduleById(did).addParamsTx(...args);
  }

  /**
   * Add a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addPositiveAccumulatorTx(id, accumulated, publicKeyRef, didKeypair) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addPositiveAccumulatorTx(
      accId,
      accumulated,
      publicKeyRef,
      didKeypair,
    );
  }

  /**
   * Add universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param maxSize - Maximum size of the accumulator
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addUniversalAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    didKeypair,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addUniversalAccumulatorTx(
      accId,
      accumulated,
      publicKeyRef,
      maxSize,
      didKeypair,
    );
  }

  /**
   * Add KB universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param signerDid - Signer of the transaction payload
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addKBUniversalAccumulatorTx(id, accumulated, publicKeyRef, didKeypair) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).addKBUniversalAccumulatorTx(
      accId,
      accumulated,
      publicKeyRef,
      didKeypair,
    );
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
   * @returns {Promise< object>}
   */
  async updateAccumulatorTx(
    id,
    newAccumulated,
    { additions, removals, witnessUpdateInfo },
    didKeypair,
  ) {
    const accId = AccumulatorId.from(id);

    return await this.moduleById(accId).updateAccumulatorTx(
      accId,
      newAccumulated,
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
}
