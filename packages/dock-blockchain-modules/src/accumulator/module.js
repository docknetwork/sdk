/* eslint-disable camelcase */

import { DockAccumulatorHistory } from '@docknetwork/credential-sdk/types';
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
    return await this.dockOnly.tx.addAccumulator(id, accumulator, didKeypair);
  }

  /**
   * Updates an existing accumulator on the blockchain
   *
   * This method replaces the current state of an accumulator with a new value.
   * The accumulator must already exist (be previously created) to be updated.
   *
   * @param {string} id - Unique identifier of the accumulator to update
   * @param {AccumulatorValue} accumulator - New accumulator value to set
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async updateAccumulatorTx(id, accumulator, didKeypair) {
    return await this.dockOnly.tx.updateAccumulator(
      id,
      accumulator,
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

  async accumulatorHistory(accumulatorId) {
    const { acc, updates } = this.accumulatorUpdates(accumulatorId);

    return new DockAccumulatorHistory(acc, updates);
  }

  async accumulatorVersions(accumulatorId) {
    const { updates } = await this.dockOnly.accumulatorHistory(accumulatorId);

    return [...updates].map(({ id }) => String(id));
  }
}
