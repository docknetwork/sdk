/* eslint-disable camelcase */

import { KBUniversalAccumulatorValue } from '@docknetwork/crypto-wasm-ts';
import { normalizeToHex, normalizeToU8a } from '../../../utils/bytes';
import { AbstractWithParamsAndPublicKeys } from '../common';
import { AccumulatorParams, AccumulatorPublicKey } from '../../../types';
import { withExtendedPrototypeProperties } from '../../../utils';

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
class AbstractAccumulatorModule extends AbstractWithParamsAndPublicKeys {
  static Params = AccumulatorParams;

  static PublicKey = AccumulatorPublicKey;

  /**
   * Return the accumulated value as hex
   * @param accumulated {Uint8Array|KBUniversalAccumulatorValue}
   * @param typ {number} - Type of the accumulator
   * @returns {string}
   */
  static accumulatedAsHex(accumulated, typ = AccumulatorType.VBPos) {
    if (typ === AccumulatorType.VBPos || typ === AccumulatorType.VBUni) {
      return normalizeToHex(accumulated);
    } else if (typ === AccumulatorType.KBUni) {
      return normalizeToHex(accumulated.toBytes());
    } else {
      throw new Error(`Unknown accumulator type ${typ}`);
    }
  }

  /**
   * Parse the given accumulated value in hex form
   * @param accumulated {string}
   * @param typ {number} - Type of the accumulator
   * @returns {Uint8Array|KBUniversalAccumulatorValue}
   */
  static accumulatedFromHex(accumulated, typ = AccumulatorType.VBPos) {
    if (typ === AccumulatorType.VBPos || typ === AccumulatorType.VBUni) {
      return normalizeToU8a(accumulated);
    } else if (typ === AccumulatorType.KBUni) {
      return KBUniversalAccumulatorValue.fromBytes(normalizeToU8a(accumulated));
    } else {
      throw new Error(`Unknown accumulator type ${typ}`);
    }
  }

  async addPublicKey(id, publicKey, targetDid, didKeypair, params) {
    return await super.addPublicKey(
      id,
      publicKey,
      targetDid,
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
    return await super.removePublicKey(
      removeKeyId,
      targetDid,
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
    return await this.signAndSend(
      await this.addPositiveAccumulatorTx(
        id,
        accumulated,
        publicKeyRef,
        didKeypair,
      ),
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
    return await this.signAndSend(
      await this.addUniversalAccumulatorTx(
        id,
        accumulated,
        publicKeyRef,
        maxSize,
        didKeypair,
      ),
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
    return await this.signAndSend(
      await this.addKBUniversalAccumulatorTx(
        id,
        accumulated,
        publicKeyRef,
        didKeypair,
      ),
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
    return await this.signAndSend(
      await this.updateAccumulatorTx(
        id,
        newAccumulated,
        {
          additions,
          removals,
          witnessUpdateInfo,
        },
        didKeypair,
      ),
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
    return await this.signAndSend(
      await this.removeAccumulatorTx(id, didKeypair),
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
  async getAccumulator(id, _includeKey = false, _includeKeyParams = false) {
    throw new Error('Unimplemented');
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
  async updateWitness(_accumulatorId, _member, _witness, _from, _to) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  [
    'getAccumulator',
    'addPositiveAccumulatorTx',
    'addUniversalAccumulatorTx',
    'addKBUniversalAccumulatorTx',
    'updateAccumulatorTx',
    'removeAccumulatorTx',
    'updateWitness',
  ],
  AbstractAccumulatorModule,
);
