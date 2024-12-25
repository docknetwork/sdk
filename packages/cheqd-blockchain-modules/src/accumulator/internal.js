import {
  CheqdStoredAccumulator,
  AccumulatorParams,
  CheqdAccumulatorId,
  CheqdAccumulatorParamsRef,
  CheqdAccumulatorWithUpdateInfo,
  CheqdCreateResource,
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
    const { AccumulatorId } = this.types;

    const [did, id] = AccumulatorId.from(accumulatorId).value;
    const storedAcc = new CheqdStoredAccumulator(
      accumulator,
    ).toJSONStringBytes();

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
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
    const { AccumulatorId } = this.types;

    const [did, id] = AccumulatorId.from(accumulatorId).value;
    const storedAcc = new CheqdStoredAccumulator(
      accumulator,
      additions,
      removals,
      witnessUpdateInfo,
    ).toJSONStringBytes();

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
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

  static PublicKeyName = 'AccumulatorPublicKey';

  static PublicKeyType = 'accumulator-public-key';

  static Params = AccumulatorParams;

  static ParamsName = 'AccumulatorParams';

  static ParamsType = 'accumulator-params';

  static ParamsRef = CheqdAccumulatorParamsRef;

  createAccumulatorMetadataFilter(name) {
    const strName = String(name);

    return (meta) => meta.resourceType === 'accumulator' && meta.name === strName;
  }

  async accumulator(accumulatorId) {
    const [did, name] = CheqdAccumulatorId.from(accumulatorId).value;
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
    const [did, name] = CheqdAccumulatorId.from(accumulatorId).value;
    const startUUID = String(TypedUUID.from(start));
    const endUUID = String(TypedUUID.from(end));

    const sortedIDs = new SortedResourceVersions(
      await this.resourcesMetadataBy(
        did,
        this.createAccumulatorMetadataFilter(name),
      ),
    ).ids();

    const startIdx = sortedIDs.findIndex((id) => id === startUUID);
    let endIdx;
    if (end != null) {
      endIdx = sortedIDs.findIndex((id) => id === endUUID);

      if (endIdx === -1) {
        throw new Error(
          `Accumulator \`${accumulatorId}\` with version \`${end}\` doesn't exist`,
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
