/* eslint-disable camelcase */

import {
  CheqdAccumulatorWithUpdateInfo,
  CheqdAccumulatorCommon,
  CheqdKBUniversalAccumulator,
  CheqdUniversalAccumulator,
  CheqdPositiveAccumulator,
  AccumulatorParams,
  CheqdAccumulatorPublicKey,
  CheqdAccumulatorIdIdent,
} from "@docknetwork/credential-sdk/types";
import { option, withProp } from "@docknetwork/credential-sdk/types/generic";
import { AbstractAccumulatorModule } from "@docknetwork/credential-sdk/modules/abstract";
import CheqdInternalAccumulatorModule from "./internal";
import { injectCheqd, withParams, withPublicKeys } from "../common";

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
export default class CheqdAccumulatorModule extends withParams(
  withPublicKeys(injectCheqd(AbstractAccumulatorModule))
) {
  static CheqdOnly = CheqdInternalAccumulatorModule;

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
    return await this.cheqdOnly.tx.addAccumulator(
      id,
      new CheqdPositiveAccumulator(
        new CheqdAccumulatorCommon(accumulated, publicKeyRef)
      ),
      didKeypair
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
    didKeypair
  ) {
    return await this.cheqdOnly.tx.addAccumulator(
      id,
      new CheqdUniversalAccumulator(
        new CheqdUniversalAccumulator.Class(
          new CheqdAccumulatorCommon(accumulated, publicKeyRef),
          maxSize
        )
      ),
      didKeypair
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
    return await this.cheqdOnly.tx.addAccumulator(
      id,
      new CheqdKBUniversalAccumulator(
        new CheqdAccumulatorCommon(accumulated, publicKeyRef)
      ),
      didKeypair
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
    didKeypair
  ) {
    return await this.cheqdOnly.tx.updateAccumulator(
      id,
      newAccumulated,
      {
        additions,
        removals,
        witnessUpdateInfo,
      },
      didKeypair
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
      ? withProp(CheqdAccumulatorPublicKey, "params", option(AccumulatorParams))
      : CheqdAccumulatorPublicKey;
    const Accumulator = includePublicKey
      ? withProp(CheqdAccumulatorWithUpdateInfo, "publicKey", option(PublicKey))
      : CheqdAccumulatorWithUpdateInfo;

    const acc = option(Accumulator).from(
      await this.cheqdOnly.query.accumulators(CheqdAccumulatorIdIdent.from(id))
    );

    if (acc == null) {
      return null;
    }

    if (includePublicKey) {
      acc.publicKey = await this.getPublicKey(...acc.keyRef, includeParams);
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
      end
    );
  }
}
