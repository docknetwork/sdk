import {
  CheqdStoredAccumulator,
  AccumulatorParams,
  CheqdAccumulatorParamsRef,
  CheqdAccumulatorWithUpdateInfo,
  CheqdCreateResource,
  DockAccumulatorWithUpdateInfo,
  CheqdAccumulatorPublicKeyId,
  CheqdAccumulatorParamsId,
  AccumulatorUpdate,
  CheqdAccumulatorHistory,
} from '@docknetwork/credential-sdk/types';
import { TypedUUID, option } from '@docknetwork/credential-sdk/types/generic';
import { stringToU8a, u8aToString } from '@docknetwork/credential-sdk/utils';
import { VBWitnessUpdateInfo } from '@docknetwork/credential-sdk/crypto';
import {
  injectParams,
  injectPublicKeys,
  createInternalCheqdModule,
  SortedResourceVersions,
  validateResource,
} from '../common';

const Type = 'accumulator';

const methods = {
  addAccumulator(accumulatorId, accumulator) {
    const { AccumulatorId, StoredAccumulator } = this.types;

    const [did, id] = AccumulatorId.from(accumulatorId).value;
    let storedAcc;
    let versionId;

    if (accumulator instanceof DockAccumulatorWithUpdateInfo) {
      storedAcc = new StoredAccumulator(
        accumulator.accumulator,
      ).toJSONStringBytes();
      versionId = TypedUUID.fromDockIdent(id, String(accumulator.lastModified));
    } else {
      storedAcc = new StoredAccumulator(accumulator).toJSONStringBytes();
      versionId = TypedUUID.random();
    }

    return new CheqdCreateResource(
      did.value.value,
      versionId,
      '1.0',
      [],
      String(id),
      Type,
      storedAcc,
    );
  },
  updateAccumulator(
    accumulatorId,
    accumulator,
    { additions, removals, witnessUpdateInfo },
  ) {
    const { AccumulatorId, StoredAccumulator } = this.types;

    const [did, id] = AccumulatorId.from(accumulatorId).value;

    let storedAcc;
    let versionId;
    if (accumulator instanceof DockAccumulatorWithUpdateInfo) {
      storedAcc = new StoredAccumulator(
        accumulator.accumulator,
        additions,
        removals,
        witnessUpdateInfo,
      ).toJSONStringBytes();
      versionId = TypedUUID.fromDockIdent(id, String(accumulator.lastModified));
    } else {
      storedAcc = new StoredAccumulator(
        accumulator,
        additions,
        removals,
        witnessUpdateInfo,
      ).toJSONStringBytes();
      versionId = TypedUUID.random();
    }

    return new CheqdCreateResource(
      did.value.value,
      versionId,
      '1.0',
      [],
      String(id),
      Type,
      storedAcc,
    );
  },
  removeAccumulator(accumulatorId) {
    const { AccumulatorId } = this.types;

    const [did, id] = AccumulatorId.from(accumulatorId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      '1.0',
      [],
      String(id),
      Type,
      stringToU8a('null'),
    );
  },
};

export default class CheqdInternalAccumulatorModule extends injectParams(
  injectPublicKeys(createInternalCheqdModule(methods)),
) {
  static get MsgNames() {
    return {
      ...super.MsgNames,
      addAccumulator: 'MsgCreateResource',
      updateAccumulator: 'MsgCreateResource',
      removeAccumulator: 'MsgCreateResource',
    };
  }

  get PublicKey() {
    return this.types.AccumulatorPublicKey;
  }

  static PublicKeyId = CheqdAccumulatorPublicKeyId;

  static PublicKeyName = 'AccumulatorPublicKey';

  static PublicKeyType = 'accumulator-public-key';

  static ParamsId = CheqdAccumulatorParamsId;

  static Params = AccumulatorParams;

  static ParamsName = 'AccumulatorParams';

  static ParamsType = 'accumulator-params';

  static ParamsRef = CheqdAccumulatorParamsRef;

  createAccumulatorMetadataFilter(name) {
    const strName = String(name);

    return (meta) => meta.resourceType === 'accumulator' && meta.name === strName;
  }

  async accumulatorVersions(accumulatorId) {
    const [did, name] = this.types.AccumulatorId.from(accumulatorId).value;

    return new SortedResourceVersions(
      await this.resourcesMetadataBy(
        did,
        this.createAccumulatorMetadataFilter(name),
      ),
    ).ids();
  }

  async accumulatorHistory(accumulatorId) {
    const [did, name] = this.types.AccumulatorId.from(accumulatorId).value;

    const ids = await this.accumulatorVersions(accumulatorId);
    if (!ids.length) {
      return null;
    }

    const resources = [
      ...new SortedResourceVersions(await this.resources(did, ids)),
    ];
    const mapUpdate = (
      {
        accumulator,
        additions,
        removals,
        witnessUpdateInfo = new Uint8Array(),
      },
      idx,
    ) => new AccumulatorUpdate(
      resources[idx + 1].metadata.id,
      accumulator.accumulated,
      additions,
      removals,
      witnessUpdateInfo,
    );

    const accumulators = resources.map((acc) => CheqdStoredAccumulator.from(
      JSON.parse(u8aToString(validateResource(acc, String(name), Type))),
    ));
    const updates = accumulators.slice(1).map(mapUpdate);

    return new CheqdAccumulatorHistory(
      new CheqdAccumulatorWithUpdateInfo(
        ids[0],
        ids[0],
        accumulators[0].accumulator,
      ),
      updates,
    );
  }

  async lastAccumulatorId(accumulatorId) {
    const [did, name] = this.types.AccumulatorId.from(accumulatorId).value;
    const lastMeta = await this.latestResourceMetadataBy(
      did,
      this.createAccumulatorMetadataFilter(name),
    );

    return lastMeta?.id;
  }

  async accumulator(accumulatorId) {
    const [did, name] = this.types.AccumulatorId.from(accumulatorId).value;
    const ids = new SortedResourceVersions(
      await this.resourcesMetadataBy(
        did,
        this.createAccumulatorMetadataFilter(name),
      ),
    ).ids();

    if (!ids.length) {
      return null;
    }

    const acc = option(CheqdStoredAccumulator).from(
      JSON.parse(
        u8aToString(
          validateResource(
            await this.resource(did, ids[ids.length - 1]),
            String(name),
            Type,
          ),
        ),
      ),
    );

    if (acc == null) {
      return null;
    }

    return new CheqdAccumulatorWithUpdateInfo(
      ids[0],
      ids[ids.length - 1],
      acc.accumulator,
    );
  }

  async lastParamsId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      this.filterParamsMetadata,
    );

    return res?.id;
  }

  async lastPublicKeyId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      this.filterPublicKeyMetadata,
    );

    return res?.id;
  }

  /**
   * Update given witness by downloading necessary blocks and applying the updates if found. Both start and end are inclusive
   * @param accumulatorId
   * @param member
   * @param witness - this will be updated to the latest witness
   * @param start - accumulator version id to start from
   * @param end - accumulator version id to end at
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async updateVbAccumulatorWitnessFromUpdatesInBlocks(
    accumulatorId,
    member,
    witness,
    start,
    end,
  ) {
    const [did, name] = this.types.AccumulatorId.from(accumulatorId).value;
    const startUUID = String(TypedUUID.from(start));
    const endUUID = String(TypedUUID.from(end));

    const sortedIDs = await this.accumulatorVersions(accumulatorId);

    let startIdx = sortedIDs.findIndex((id) => id === startUUID);
    if (startIdx === -1) {
      throw new Error(
        `Accumulator \`${accumulatorId}\` with version \`${startUUID}\` doesn't exist`,
      );
    } else if (startIdx === 0) {
      startIdx = 1;
    }
    let endIdx;
    if (end != null) {
      endIdx = sortedIDs.findIndex((id) => id === endUUID);

      if (endIdx === -1) {
        throw new Error(
          `Accumulator \`${accumulatorId}\` with version \`${endUUID}\` doesn't exist`,
        );
      }
    } else {
      endIdx = sortedIDs.length - 1;
    }

    const accumulators = await this.resources(
      did,
      sortedIDs.slice(startIdx, endIdx + 1),
    );

    for (const accumulator of new SortedResourceVersions(accumulators)) {
      const { additions, removals, witnessUpdateInfo } = CheqdStoredAccumulator.from(
        validateResource(accumulator, String(name), Type),
      );

      witness.updateUsingPublicInfoPostBatchUpdate(
        member,
        additions ? [...additions].map((addition) => addition.bytes) : [],
        removals ? [...removals].map((removal) => removal.bytes) : [],
        new VBWitnessUpdateInfo(witnessUpdateInfo?.bytes || new Uint8Array()),
      );
    }
  }
}
