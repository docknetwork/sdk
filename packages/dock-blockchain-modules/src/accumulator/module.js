/* eslint-disable camelcase */

import {
  DockAccumulatorWithUpdateInfo,
  DockAccumulatorCommon,
  DockKBUniversalAccumulator,
  DockUniversalAccumulator,
  DockPositiveAccumulator,
  AccumulatorParams,
  DockAccumulatorPublicKey,
  DockAccumulatorParamsRef,
  DockAccumulatorIdIdent,
} from "@docknetwork/credential-sdk/types";
import { option, withProp } from "@docknetwork/credential-sdk/types/generic";
import { AbstractAccumulatorModule } from "@docknetwork/credential-sdk/modules/abstract/accumulator";
import DockInternalAccumulatorModule from "./internal";
import { injectDock, withParams, withPublicKeys } from "../common";

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
export default class DockAccumulatorModule extends withParams(
  withPublicKeys(injectDock(AbstractAccumulatorModule))
) {
  static DockOnly = DockInternalAccumulatorModule;

  static ParamsRef = DockAccumulatorParamsRef;

  async addPublicKeyTx(...args) {
    if (args.length === 4) {
      const [id, publicKey, targetDid, didKeypair] = args;

      return await super.addPublicKeyTx(id, publicKey, targetDid, didKeypair);
    } else {
      return await super.addPublicKeyTx(...args);
    }
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
    if (args.length === 3) {
      const [id, did, didKeypair] = args;

      return await super.removePublicKeyTx(id, did, didKeypair);
    } else {
      return await super.removePublicKeyTx(...args);
    }
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
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockPositiveAccumulator(
        new DockAccumulatorCommon(accumulated, publicKeyRef)
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
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockUniversalAccumulator(
        new DockUniversalAccumulator.Class(
          new DockAccumulatorCommon(accumulated, publicKeyRef),
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
    return await this.dockOnly.tx.addAccumulator(
      id,
      new DockKBUniversalAccumulator(
        new DockAccumulatorCommon(accumulated, publicKeyRef)
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
    return await this.dockOnly.tx.updateAccumulator(
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
   * @returns {Promise<{created: *, lastModified: *}|null>}
   */
  async getAccumulator(id, includePublicKey = false, includeParams = false) {
    const PublicKey = includeParams
      ? withProp(DockAccumulatorPublicKey, "params", option(AccumulatorParams))
      : DockAccumulatorPublicKey;
    const Accumulator = includePublicKey
      ? withProp(DockAccumulatorWithUpdateInfo, "publicKey", option(PublicKey))
      : DockAccumulatorWithUpdateInfo;

    const acc = option(Accumulator).from(
      await this.dockOnly.query.accumulators(DockAccumulatorIdIdent.from(id))
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
      end
    );
  }
}
