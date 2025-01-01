import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types/did/onchain';
import {
  DockAccumulatorCounters,
  AccumulatorParams,
  AccumulatorPublicKey,
  DockAccumulatorId,
  DockAccumulatorPublicKey,
  DockAccumulatorWithUpdateInfo,
  DockAccumulatorParamsRef,
  DockAccumulatorParamsId,
  DockAccumulatorIdIdent,
  DockAccumulatorPublicKeyId,
} from '@docknetwork/credential-sdk/types';
import { option, withProp } from '@docknetwork/credential-sdk/types/generic';
import { inclusiveRange, u8aToHex } from '@docknetwork/credential-sdk/utils';
import { VBWitnessUpdateInfo } from '@docknetwork/credential-sdk/crypto';
import {
  injectParams,
  injectPublicKeys,
  createInternalDockModule,
} from '../common';
import {
  AddAccumulator,
  AddAccumulatorParams,
  AddAccumulatorPublicKey,
  RemoveAccumulator,
  RemoveAccumulatorParams,
  RemoveAccumulatorPublicKey,
  UpdateAccumulator,
} from './actions';

const didMethods = {
  addAccumulator: (id, accumulator, _, nonce) => new AddAccumulator(id, accumulator, nonce),
  updateAccumulator: (
    id,
    newAccumulated,
    { additions, removals, witnessUpdateInfo },
    _,
    nonce,
  ) => new UpdateAccumulator(
    id,
    newAccumulated,
    additions,
    removals,
    witnessUpdateInfo,
    nonce,
  ),
  removeAccumulator: (id, _, nonce) => new RemoveAccumulator(id, nonce),
};

export default class DockInternalAccumulatorModule extends injectParams(
  injectPublicKeys(createInternalDockModule({ didMethods })),
) {
  static Prop = 'accumulator';

  static MethodNameOverrides = {
    addPublicKey: 'AddAccumulatorPublicKey',
    removePublicKey: 'RemoveAccumulatorPublicKey',
    addParams: 'AddAccumulatorParams',
    removeParams: 'RemoveAccumulatorParams',
  };

  static ParamsQuery = 'accumulatorParams';

  static PublicKeyQuery = 'accumulatorKeys';

  static PublicKeyId = DockAccumulatorPublicKeyId;

  static PublicKey = AccumulatorPublicKey;

  static PublicKeyOwner = DockDidOrDidMethodKey;

  static ParamsId = DockAccumulatorParamsId;

  static Params = AccumulatorParams;

  static ParamsRef = DockAccumulatorParamsRef;

  static PublicKeyAndParamsActions = {
    AddPublicKey: AddAccumulatorPublicKey,
    RemovePublicKey: RemoveAccumulatorPublicKey,
    AddParams: AddAccumulatorParams,
    RemoveParams: RemoveAccumulatorParams,
  };

  async getAccumulator(
    id,
    includePublicKey = false,
    includeParams = false,
    at,
  ) {
    const accId = DockAccumulatorIdIdent.from(id);
    const PublicKey = includeParams
      ? withProp(DockAccumulatorPublicKey, 'params', option(AccumulatorParams))
      : DockAccumulatorPublicKey;
    const Accumulator = includePublicKey
      ? withProp(DockAccumulatorWithUpdateInfo, 'publicKey', option(PublicKey))
      : DockAccumulatorWithUpdateInfo;

    const acc = option(Accumulator).from(
      at == null
        ? await this.query.accumulators(accId)
        : await this.query.accumulators.at(
          await this.apiProvider.numberToHash(+at),
          accId,
        ),
    );

    if (acc == null) {
      return null;
    }

    if (includePublicKey) {
      acc.publicKey = await this.getPublicKey(...acc.keyRef, includeParams);
    }

    return acc;
  }

  async counters(did) {
    return DockAccumulatorCounters.from(
      await this.query.accumulatorOwnerCounters(DockDidOrDidMethodKey.from(did)),
    );
  }

  async paramsCounter(did) {
    return (await this.counters(did)).paramsCounter;
  }

  async keysCounter(did) {
    return (await this.counters(did)).keyCounter;
  }

  async lastParamsId(did) {
    return await this.paramsCounter(did);
  }

  async lastPublicKeyId(did) {
    return await this.keysCounter(did);
  }

  /**
   * Update given witness by downloading necessary blocks and applying the updates if found. Both start and end are inclusive
   * @param accumulatorId
   * @param member
   * @param witness - this will be updated to the latest witness
   * @param startBlock - block number to start from
   * @param endBlock - block number to end at. If not specified, it will pick the `lastUpdated` field of the accumulator.
   * @param batchSize - the number of blocks to fetch in one go
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async updateVbAccumulatorWitnessFromUpdatesInBlocks(
    accumulatorId,
    member,
    witness,
    startBlock,
    endBlock,
    batchSize = 10,
  ) {
    if (endBlock === undefined) {
      const accum = await this.getAccumulator(accumulatorId, false);

      // eslint-disable-next-line no-param-reassign
      endBlock = accum.lastModified;
    }
    // If endBlock < startBlock, it won't throw an error but won't fetch any updates and witness won't be updated.
    console.debug(
      `Will start updating witness from block ${startBlock} to ${endBlock}`,
    );
    let current = startBlock;
    while (current <= endBlock) {
      const till = current + batchSize <= endBlock ? current + batchSize : endBlock;
      // Get updates from blocks [current, current + 1, current + 2, ..., till]
      // eslint-disable-next-line no-await-in-loop
      const updates = await this.getUpdatesFromBlocks(
        accumulatorId,
        inclusiveRange(current, till, 1),
      );
      for (const update of updates) {
        const additions = [...(update.additions ?? [])].map(
          (value) => value.bytes,
        );
        const removals = [...(update.removals ?? [])].map(
          (value) => value.bytes,
        );

        console.debug(
          `Found ${additions?.length} additions and ${removals?.length} removals in block no ${current}`,
        );

        const queriedWitnessInfo = new VBWitnessUpdateInfo(
          update.witnessUpdateInfo.bytes,
        );

        witness.updateUsingPublicInfoPostBatchUpdate(
          member,
          additions,
          removals,
          queriedWitnessInfo,
        );
      }
      current = till + 1;
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

  /**
   * Fetch a block and get all accumulator updates made in that block's extrinsics corresponding to accumulator id `accumulatorId`
   * @param accumulatorId
   * @param blockNoOrBlockHash
   * @returns {Promise<object[]>} - Resolves to an array of `update`s where each `update` is an object with keys
   * `newAccumulated`, `additions`, `removals` and `witnessUpdateInfo`. The last keys have value null if they were
   * not provided in the extrinsic.
   */
  async getUpdatesFromBlock(accumulatorId, blockNoOrBlockHash) {
    const extrinsics = await this.apiProvider.getAllExtrinsicsFromBlock(
      blockNoOrBlockHash,
      false,
    );

    return extrinsics
      .map((e) => this.getUpdatesFromExtrinsic(e, accumulatorId))
      .filter(Boolean);
  }

  async accumulatorHistory(accumulatorId) {
    let acc = await this.getAccumulator(accumulatorId);
    let updates = [];

    while (!acc.lastModified.eq(acc.createdAt)) {
      updates = updates.concat(
        // eslint-disable-next-line no-await-in-loop
        await this.getUpdatesFromBlock(accumulatorId, acc.lastModified),
      );

      // eslint-disable-next-line no-await-in-loop
      acc = await this.getAccumulator(
        accumulatorId,
        false,
        false,
        acc.lastModified - 1,
      );
    }

    return { created: acc, updates };
  }

  /**
   * Fetch blocks corresponding to the given block numbers or hashes and get all accumulator updates made in those blocks' extrinsics corresponding to accumulator id `accumulatorId`
   * @param accumulatorId
   * @param blockNosOrBlockHashes {number[]|string[]}
   * @returns {Promise<object[]>} - Resolves to an array of `update`s where each `update` is an object with keys
   * `newAccumulated`, `additions`, `removals` and `witnessUpdateInfo`. The last keys have value null if they were
   * not provided in the extrinsic.
   */
  async getUpdatesFromBlocks(accumulatorId, blockNosOrBlockHashes) {
    // NOTE: polkadot-js doesn't allow to fetch more than one block in 1 RPC call.
    const extrinsics = await Promise.all(
      blockNosOrBlockHashes.map(
        async (b) => await this.apiProvider.getAllExtrinsicsFromBlock(b, false),
      ),
    );

    return extrinsics
      .flat()
      .map((e) => this.getUpdatesFromExtrinsic(e, accumulatorId))
      .filter(Boolean);
  }

  /**
   * Get accumulator updates corresponding to accumulator id `accumulatorId`
   * @param ext
   * @param accumulatorId
   * @returns {Promise<object|undefined>} - Resolves to an `update` object with keys `newAccumulated`, `additions`, `removals` and `witnessUpdateInfo`.
   * The last keys have value null if they were not provided in the extrinsic.
   */
  getUpdatesFromExtrinsic(ext, accumulatorId) {
    const accId = DockAccumulatorId.from(accumulatorId);

    if (
      ext.method
      && ext.method.section === 'accumulator'
      && ext.method.method === 'updateAccumulator'
    ) {
      const update = UpdateAccumulator.from(
        this.apiProvider.api.createType('UpdateAccumulator', ext.method.args[0]),
      );

      if (update.id.eq(accId.asDock)) {
        return update;
      }
    }

    return null;
  }
}
