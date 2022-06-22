/* eslint-disable camelcase */

import { isHex, u8aToHex } from '@polkadot/util';
import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import WithParamsAndPublicKeys from './WithParamsAndPublicKeys';
import { getAllExtrinsicsFromBlock } from '../utils/chain-ops';

/** Class to manage accumulators on chain */
export default class AccumulatorModule extends WithParamsAndPublicKeys {
  constructor(api, signAndSend) {
    super();
    this.api = api;
    this.moduleName = 'accumulator';
    this.module = api.tx[this.moduleName];
    this.signAndSend = signAndSend;
  }

  static prepareAddPositiveAccumulator(id, accumulated, publicKeyRef) {
    const vals = AccumulatorModule.parseRef(publicKeyRef);
    return {
      id,
      accumulator: {
        Positive: {
          accumulated,
          keyRef: vals,
        },
      },
    };
  }

  static prepareAddUniversalAccumulator(id, accumulated, publicKeyRef, maxSize) {
    const vals = AccumulatorModule.parseRef(publicKeyRef);
    return {
      id,
      accumulator: {
        Universal: {
          common: {
            accumulated,
            keyRef: vals,
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

  createNewPositiveAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    keyPair = undefined,
    signature = undefined,
  ) {
    const accum = this.constructor.prepareAddPositiveAccumulator(
      id,
      accumulated,
      publicKeyRef,
    );
    if (!signature) {
      if (!keyPair) {
        throw Error(
          'You need to provide either a keypair or a signature to register new accumulator.',
        );
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signAddAccumulator(keyPair, accum);
    }
    return this.module.addAccumulator(
      accum,
      signature.toJSON(),
    );
  }

  createNewUniversalAccumulatorTx(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    keyPair = undefined,
    signature = undefined,
  ) {
    const accum = this.constructor.prepareAddUniversalAccumulator(
      id,
      accumulated,
      publicKeyRef,
      maxSize,
    );
    if (!signature) {
      if (!keyPair) {
        throw Error(
          'You need to provide either a keypair or a signature to register new accumulator.',
        );
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signAddAccumulator(keyPair, accum);
    }
    return this.module.addAccumulator(
      accum,
      signature.toJSON(),
    );
  }

  /**
   *
   * @param id
   * @param newAccumulated
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e. the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @returns {Promise<object>}
   */
  updateAccumulatorTx(
    id,
    newAccumulated,
    {
      additions = undefined,
      removals = undefined,
      witnessUpdateInfo = undefined,
    },
    created,
    nonce,
    keyPair = undefined,
    signature = undefined,
  ) {
    if (additions !== undefined) {
      AccumulatorModule.ensureArrayOfBytearrays(additions);
    }
    if (removals !== undefined) {
      AccumulatorModule.ensureArrayOfBytearrays(removals);
    }
    if (witnessUpdateInfo !== undefined && !isHex(witnessUpdateInfo)) {
      throw new Error(`Require a hex string but got ${witnessUpdateInfo}`);
    }
    const update = {
      id,
      newAccumulated,
      additions,
      removals,
      witnessUpdateInfo: this.api.createType(
        'Option<Vec<u8>>',
        witnessUpdateInfo,
      ),
      createdAt: created,
      nonce,
    };
    if (!signature) {
      if (!keyPair) {
        throw Error(
          'You need to provide either a keypair or a signature to update the accumulator.',
        );
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signUpdateAccumulator(keyPair, update);
    }
    return this.module.updateAccumulator(
      update,
      signature.toJSON(),
    );
  }

  /**
   *
   * @param id
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e. the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @returns {Promise<object>}
   */
  removeAccumulatorTx(id, created, nonce, keyPair, signature) {
    const removal = {
      id,
      createdAt: created,
      nonce,
    };
    if (!signature) {
      if (!keyPair) {
        throw Error(
          'You need to provide either a keypair or a signature to remove the accumulator.',
        );
      }
      // eslint-disable-next-line no-param-reassign
      signature = this.signRemoveAccumulator(keyPair, removal);
    }
    return this.module.removeAccumulator(
      removal,
      signature.toJSON(),
    );
  }

  /**
   * Send txn on chain that creates accumulator that supports only membership proofs
   * @param id - Unique id of the new accumulator
   * @param accumulated
   * @param publicKeyRef - reference to the public key of the accumulator as pair [did, counter]
   * @param keyPair
   * @param signature
   * @param waitForFinalization
   * @param params
   * @returns {Promise<object>}
   */
  async createNewPositiveAccumulator(
    id,
    accumulated,
    publicKeyRef,
    keyPair = undefined,
    signature = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = this.createNewPositiveAccumulatorTx(
      id,
      accumulated,
      publicKeyRef,
      keyPair,
      signature,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Send txn on chain that creates accumulator that supports both membership and non-membership proofs
   * @param id
   * @param accumulated
   * @param publicKeyRef - reference to the public key of the accumulator as pair [did, counter]
   * @param maxSize - Maximum size of the accumulator. This is not enforced on chain and serves as metadata only
   * @param keyPair
   * @param signature
   * @param waitForFinalization
   * @param params
   * @returns {Promise<object>}
   */
  async createNewUniversalAccumulator(
    id,
    accumulated,
    publicKeyRef,
    maxSize,
    keyPair = undefined,
    signature = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = this.createNewUniversalAccumulatorTx(
      id,
      accumulated,
      publicKeyRef,
      maxSize,
      keyPair,
      signature,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Update existing accumulator
   * @param id
   * @param newAccumulated
   * @param additions
   * @param removals
   * @param witnessUpdateInfo
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e the nonce on chain + 1
   * @param keyPair
   * @param signature
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
    created,
    nonce,
    keyPair = undefined,
    signature = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = this.updateAccumulatorTx(
      id,
      newAccumulated,
      { additions, removals, witnessUpdateInfo },
      created,
      nonce,
      keyPair,
      signature,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Remove the accumulator from chain. This frees up the id for reuse.
   * @param id
   * @param created - block no. when accumulator was created
   * @param nonce - next valid nonce, i.e the nonce on chain + 1
   * @param keyPair
   * @param signature
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeAccumulator(
    id,
    created,
    nonce,
    keyPair = undefined,
    signature = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = this.removeAccumulatorTx(id, created, nonce, keyPair, signature);
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Get the accumulator as an object. The field `type` in object specifies whether it is "positive" or "universal".
   * Fields `created` and `lastModified` are block nos where the accumulator was created and last updated respectively.
   * Field `nonce` is the last accepted nonce by the chain, the next write to the accumulator should increment the nonce by 1.
   * Field `accumulated` contains the current accumulated value.
   * @param id
   * @param withKeyAndParams
   * @returns {Promise<{created: *, lastModified: *}|null>}
   */
  async getAccumulator(id, withKeyAndParams = false) {
    const resp = await this.api.query[this.moduleName].accumulators(
      id,
    );
    if (resp.isSome) {
      const [created, lastModified, nonce, accumulator] = resp.unwrap();
      const accumulatorObj = {
        created: created.toNumber(),
        lastModified: lastModified.toNumber(),
        nonce: nonce.toNumber(),
      };
      let common;
      if (accumulator.isPositive) {
        accumulatorObj.type = 'positive';
        common = accumulator.asPositive;
      } else {
        accumulatorObj.type = 'universal';
        common = accumulator.asUniversal.common;
        accumulatorObj.maxSize = accumulator.asUniversal.maxSize.toNumber();
      }
      accumulatorObj.accumulated = u8aToHex(common.accumulated);
      accumulatorObj.keyRef = [
        u8aToHex(common.keyRef[0]),
        common.keyRef[1].toNumber(),
      ];

      if (withKeyAndParams) {
        const pk = await this.getPublicKeyByHexDid(
          accumulatorObj.keyRef[0],
          accumulatorObj.keyRef[1],
          true,
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
        const update = ext.method.args[0];

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

  async queryParamsFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].accumulatorParams(
      hexDid,
      counter,
    );
  }

  async queryPublicKeyFromChain(hexDid, counter) {
    return this.api.query[this.moduleName].accumulatorKeys(
      hexDid,
      counter,
    );
  }

  signAddParams(keyPair, params) {
    const serialized = getStateChange(this.api, 'AddAccumulatorParams', params);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signAddPublicKey(keyPair, pk) {
    const serialized = getStateChange(this.api, 'AddAccumulatorPublicKey', pk);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemoveParams(keyPair, ref) {
    const serialized = getStateChange(this.api, 'RemoveAccumulatorParams', ref);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemovePublicKey(keyPair, ref) {
    const serialized = getStateChange(
      this.api,
      'RemoveAccumulatorPublicKey',
      ref,
    );
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signAddAccumulator(keyPair, addAccumulator) {
    const serialized = getStateChange(
      this.api,
      'AddAccumulator',
      addAccumulator,
    );
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signUpdateAccumulator(keyPair, update) {
    const serialized = getStateChange(this.api, 'UpdateAccumulator', update);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }

  signRemoveAccumulator(keyPair, id) {
    const serialized = getStateChange(this.api, 'RemoveAccumulator', id);
    return getSignatureFromKeyringPair(keyPair, serialized);
  }
}
