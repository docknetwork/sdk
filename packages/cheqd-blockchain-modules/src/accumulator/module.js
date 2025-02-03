/* eslint-disable camelcase */

import {
  CheqdAccumulatorWithUpdateInfo,
  AccumulatorParams,
  CheqdAccumulatorPublicKey,
  Accumulator,
} from '@docknetwork/credential-sdk/types';
import { option, withProp } from '@docknetwork/credential-sdk/types/generic';
import { AbstractAccumulatorModule } from '@docknetwork/credential-sdk/modules/abstract';
import CheqdInternalAccumulatorModule from './internal';
import { injectCheqd, withParams, withPublicKeys } from '../common';

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
export default class CheqdAccumulatorModule extends withParams(
  withPublicKeys(injectCheqd(AbstractAccumulatorModule)),
) {
  static CheqdOnly = CheqdInternalAccumulatorModule;

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
    return await this.cheqdOnly.tx.addAccumulator(
      id,
      Accumulator.from(accumulator),
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
      Accumulator.from(accumulator),
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
    return await this.cheqdOnly.tx.removeAccumulator(id, didKeypair);
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param includePublicKey - Fetch public key
   * @param includeParams - Fetch params for the publicKey
   * @returns {Promise<{created: *, lastModified: *}|null>}
   */
  async getAccumulator(id, includePublicKey = false, includeParams = false) {
    const PublicKey = includeParams
      ? withProp(this.cheqdOnly.PublicKey, 'params', option(AccumulatorParams))
      : CheqdAccumulatorPublicKey;
    const Accumulator = includePublicKey
      ? withProp(CheqdAccumulatorWithUpdateInfo, 'publicKey', option(PublicKey))
      : CheqdAccumulatorWithUpdateInfo;

    const acc = option(Accumulator).from(await this.cheqdOnly.accumulator(id));
    if (acc == null) {
      return null;
    } else if (includePublicKey) {
      acc.publicKey = await this.getPublicKey(
        ...acc.accumulator.keyRef,
        includeParams,
      );
    }

    return acc;
  }

  /**
   * Update given witness by downloading necessary accumulators (blocks) and applying the updates if found.
   * **Both start and end are inclusive.**
   *
   * @param accumulatorId
   * @param member
   * @param witness - this will be updated to the latest witness
   * @param start - identifier to start from (collection item id)
   * @param end - identifier to end in (collection item id)
   * @returns {Promise<void>}
   */
  async updateWitness(accumulatorId, member, witness, start, end) {
    return await this.cheqdOnly.updateVbAccumulatorWitnessFromUpdatesInBlocks(
      accumulatorId,
      member,
      witness,
      start,
      end,
    );
  }

  /**
   * Retrieves the history of updates for a given accumulator ID.
   *
   * @param {*} accumulatorId - The unique identifier of the accumulator to get history for
   * @returns {Promise<{ created: *, updates: * }>} Promise resolving to array of historical accumulator data
   */
  async accumulatorHistory(accumulatorId) {
    return await this.cheqdOnly.accumulatorHistory(accumulatorId);
  }

  /**
   * Gets all versions of an accumulator as strings.
   *
   * This method fetches version numbers for the given accumulator and converts them to string type.
   *
   * @param {*} accumulatorId - The unique identifier of the accumulator
   * @returns {Promise<Array<string>>} Promise resolving to array of version numbers as strings
   */
  async accumulatorVersions(accumulatorId) {
    return await this.cheqdOnly.accumulatorVersions(accumulatorId);
  }
}
