/* eslint-disable camelcase */

import {
  DockAccumulatorCommon,
  DockKBUniversalAccumulator,
  DockUniversalAccumulator,
  DockPositiveAccumulator,
} from '@docknetwork/credential-sdk/types';
import { AbstractAccumulatorModule } from '@docknetwork/credential-sdk/modules/abstract';
import DockInternalAccumulatorModule from './internal';
import { injectDock, withParams, withPublicKeys } from '../common';

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
export default class DockAccumulatorModule extends withParams(
  withPublicKeys(injectDock(AbstractAccumulatorModule)),
) {
  static DockOnly = DockInternalAccumulatorModule;

  /**
   * Add a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addPositiveAccumulatorTx(id, accumulated, publicKeyRef, didKeypair) {
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockPositiveAccumulator(
        new DockAccumulatorCommon(accumulated, publicKeyRef),
      ),
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
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addUniversalAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    didKeypair,
  ) {
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockUniversalAccumulator(
        new DockUniversalAccumulator.Class(
          new DockAccumulatorCommon(accumulated, publicKeyRef),
          maxSize,
        ),
      ),
      didKeypair,
    );
  }

  /**
   * Add KB universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addKBUniversalAccumulatorTx(id, accumulated, publicKeyRef, didKeypair) {
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockKBUniversalAccumulator(
        new DockAccumulatorCommon(accumulated, publicKeyRef),
      ),
      didKeypair,
    );
  }

  /**
   * Update a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async updatePositiveAccumulatorTx(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    _publicKeyRef,
    didKeypair,
  ) {
    return await this.dockOnly.tx.updateAccumulator(
      id,
      accumulated,
      {
        additions,
        removals,
        witnessUpdateInfo,
      },
      didKeypair,
    );
  }

  /**
   * Update universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param maxSize - Maximum size of the accumulator
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  // eslint-disable-next-line sonarjs/no-identical-functions
  async updateUniversalAccumulatorTx(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    _publicKeyRef,
    _maxSize,
    didKeypair,
  ) {
    return await this.dockOnly.tx.updateAccumulator(
      id,
      accumulated,
      {
        additions,
        removals,
        witnessUpdateInfo,
      },
      didKeypair,
    );
  }

  /**
   * Update KB universal (supports add/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  // eslint-disable-next-line sonarjs/no-identical-functions
  async updateKBUniversalAccumulatorTx(
    id,
    accumulated,
    { additions, removals, witnessUpdateInfo },
    _publicKeyRef,
    didKeypair,
  ) {
    return await this.dockOnly.tx.updateAccumulator(
      id,
      accumulated,
      {
        additions,
        removals,
        witnessUpdateInfo,
      },
      didKeypair,
    );
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id - id to remove
   * @param didKeypair - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeAccumulatorTx(id, didKeypair) {
    return await this.dockOnly.tx.removeAccumulator(id, didKeypair);
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param includePublicKey - Fetch public key
   * @param includeParams - Fetch params for the publicKey
   * @returns {Promise<DockAccumulatorWithUpdateInfo>}
   */
  async getAccumulator(id, includePublicKey = false, includeParams = false) {
    return await this.dockOnly.getAccumulator(
      id,
      includePublicKey,
      includeParams,
    );
  }

  /**
   * Update given witness by downloading necessary accumulators (blocks) and applying the updates if found.
   * **Both start and end are inclusive.**
   *
   * @param accumulatorId
   * @param member
   * @param witness - this will be updated to the latest witness
   * @param startBlock - identifier to start from (block number or collection item id)
   * @param endBlock - identifier to end in (block number or collection item id)
   * @returns {Promise<void>}
   */
  async updateWitness(accumulatorId, member, witness, start, end) {
    return await this.dockOnly.updateVbAccumulatorWitnessFromUpdatesInBlocks(
      accumulatorId,
      member,
      witness,
      start,
      end,
    );
  }
}
