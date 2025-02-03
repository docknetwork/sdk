/* eslint-disable camelcase */

import { KBUniversalAccumulatorValue } from '@docknetwork/crypto-wasm-ts';
import { normalizeToHex, normalizeToU8a } from '../../../utils/bytes';
import {
  AbstractBaseModule,
  withAbstractParams,
  withAbstractPublicKeys,
} from '../common';
import {
  AccumulatorCommon,
  AccumulatorParams,
  AccumulatorPublicKey,
  KBUniversalAccumulator,
  PositiveAccumulator,
  UniversalAccumulator,
} from '../../../types';
import { withExtendedPrototypeProperties } from '../../../utils';

export const AccumulatorType = {
  VBPos: 0,
  VBUni: 1,
  KBUni: 2,
};

/** Class to manage accumulators on chain */
class AbstractAccumulatorModule extends withAbstractParams(
  withAbstractPublicKeys(AbstractBaseModule),
) {
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
    return await this.signAndSend(
      await this.addAccumulatorTx(id, accumulator, didKeypair),
      params,
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
   * @param {DidKeypair} didKeypair - Keypair used to sign the transaction
   * @returns {Promise<*>} Promise resolving to the transaction result
   */
  async updateAccumulator(
    id,
    accumulator,
    { additions, removals, witnessUpdateInfo },
    didKeypair,
    params,
  ) {
    return await this.signAndSend(
      await this.updateAccumulatorTx(
        id,
        accumulator,
        { additions, removals, witnessUpdateInfo },
        didKeypair,
      ),
      params,
    );
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   *
   * @param id - id to remove
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
   * @returns {Promise<*>}
   */
  async removeAccumulator(id, didKeypair, params) {
    return await this.signAndSend(
      await this.removeAccumulatorTx(id, didKeypair),
      params,
    );
  }

  /**
   * Add a positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
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
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
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
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
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
   * Update existing positive (add-only) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
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
    return await this.signAndSend(
      await this.updatePositiveAccumulatorTx(
        id,
        accumulated,
        { additions, removals, witnessUpdateInfo },
        publicKeyRef,
        didKeypair,
      ),
      params,
    );
  }

  /**
   * Update existing universal (supports update/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param maxSize - Maximum size of the accumulator
   * @param didKeypair - Signer's keypair reference
   * @param params - Transaction parameters.
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
    return await this.signAndSend(
      await this.updateUniversalAccumulatorTx(
        id,
        accumulated,
        { additions, removals, witnessUpdateInfo },
        publicKeyRef,
        maxSize,
        didKeypair,
      ),
      params,
    );
  }

  /**
   * Update existing KB universal (supports update/remove) accumulator
   * @param id - Unique accumulator id
   * @param accumulated - Current accumulated value.
   * @param publicKeyRef - Reference to accumulator public key. If the reference contains the key id 0, it means the accumulator does not
   * have any public key on the chain. This is useful for KVAC.
   * @param didKeypair - Signer's keypair reference
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
    return await this.signAndSend(
      await this.updateKBUniversalAccumulatorTx(
        id,
        accumulated,
        { additions, removals, witnessUpdateInfo },
        publicKeyRef,
        didKeypair,
      ),
      params,
    );
  }

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
    return await this.addAccumulatorTx(
      id,
      new PositiveAccumulator(new AccumulatorCommon(accumulated, publicKeyRef)),
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
    return await this.addAccumulatorTx(
      id,
      new UniversalAccumulator(
        new UniversalAccumulator.Class(
          new AccumulatorCommon(accumulated, publicKeyRef),
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
    return await this.addAccumulatorTx(
      id,
      new KBUniversalAccumulator(
        new AccumulatorCommon(accumulated, publicKeyRef),
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
    publicKeyRef,
    didKeypair,
  ) {
    return await this.updateAccumulatorTx(
      id,
      new PositiveAccumulator(new AccumulatorCommon(accumulated, publicKeyRef)),
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
    publicKeyRef,
    maxSize,
    didKeypair,
  ) {
    return await this.updateAccumulatorTx(
      id,
      new UniversalAccumulator(
        new UniversalAccumulator.Class(
          new AccumulatorCommon(accumulated, publicKeyRef),
          maxSize,
        ),
      ),
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
    publicKeyRef,
    didKeypair,
  ) {
    return await this.updateAccumulatorTx(
      id,
      new KBUniversalAccumulator(
        new AccumulatorCommon(accumulated, publicKeyRef),
      ),
      {
        additions,
        removals,
        witnessUpdateInfo,
      },
      didKeypair,
    );
  }

  /**
   * Add an accumulator to the chain.
   *
   * @param id - Unique accumulator id
   * @param accumulator - Accumulator value.
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addAccumulatorTx(_id, _accumulator, _didKeypair) {
    throw new Error('Unimplemented');
  }

  /**
   * Update existing accumulator on the chain.
   *
   * @param id - Unique accumulator id
   * @param accumulator - Accumulator value.
   * @param {object} changes
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async updateAccumulatorTx(
    _id,
    _accumulator,
    { additions: _, removals: __, witnessUpdateInfo: ___ },
    _didKeypair,
  ) {
    throw new Error('Unimplemented');
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are identifiers where the accumulator was created and last updated respectively.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param includeKey - Fetch public key for the given accumulator.
   * @param includeKeyParams - Fetch public key params.
   * @returns {Promise<Accumulator|null>}
   */
  async getAccumulator(_id, _includeKey = false, _includeKeyParams = false) {
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
    'addAccumulatorTx',
    'updateAccumulatorTx',
    'removeAccumulatorTx',
    'updateWitness',
  ],
  AbstractAccumulatorModule,
);
