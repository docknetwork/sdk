import { CheqdDidOrDidMethodKey } from "@docknetwork/credential-sdk/types/did/onchain";
import {
  CheqdStoredAccumulator,
  AccumulatorParams,
  AccumulatorPublicKey,
  CheqdAccumulatorId,
  CheqdAccumulatorParamsRef,
  CheqdAccumulatorWithUpdateInfo,
  CheqdCreateResource,
} from "@docknetwork/credential-sdk/types";
import { option, TypedUUID } from "@docknetwork/credential-sdk/types/generic";
import {
  inclusiveRange,
  u8aToHex,
  stringToU8a,
} from "@docknetwork/credential-sdk/utils";
import { VBWitnessUpdateInfo } from "@docknetwork/credential-sdk/crypto";
import {
  injectParams,
  injectPublicKeys,
  createInternalCheqdModule,
} from "../common";
import ResourcesMap from "../common/resources-map";

const methods = {
  addAccumulator: (accumulatorId, accumulator) => {
    const [did, id] = CheqdAccumulatorId.from(accumulatorId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      "1.0",
      [],
      id,
      "accumulator",
      new CheqdStoredAccumulator(accumulator).toJSONStringBytes()
    );
  },
  updateAccumulator: (
    accumulatorId,
    newAccumulated,
    { additions, removals, witnessUpdateInfo }
  ) => {
    const [did, id] = CheqdAccumulatorId.from(accumulatorId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      "1.0",
      [],
      id,
      "accumulator",
      new CheqdStoredAccumulator(
        newAccumulated,
        additions,
        removals,
        witnessUpdateInfo
      ).toJSONStringBytes()
    );
  },
  removeAccumulator: (accumulatorId) => {
    const [did, id] = CheqdAccumulatorId.from(accumulatorId).value;

    return new CheqdCreateResource(
      did.value.value,
      TypedUUID.random(),
      "1.0",
      [],
      id,
      "accumulator",
      stringToU8a("null")
    );
  },
};

export default class CheqdInternalAccumulatorModule extends injectParams(
  injectPublicKeys(createInternalCheqdModule(methods))
) {
  static MsgNames = {
    addPublicKey: "MsgCreateResource",
    removePublicKey: "MsgCreateResource",
    addParams: "MsgCreateResource",
    removeParams: "MsgCreateResource",
  };

  static PublicKey = AccumulatorPublicKey;

  static PublicKeyName = "AccumulatorPublicKey";

  static PublicKeyType = "accumulator-public-key";

  static PublicKeyOwner = CheqdDidOrDidMethodKey;

  static Params = AccumulatorParams;

  static ParamsName = "AccumulatorParams";

  static ParamsType = "accumulator-params";

  static ParamsRef = CheqdAccumulatorParamsRef;

  createAccumulatorMetadataFilter(name) {
    const strName = String(name);

    return (meta) =>
      meta.resourceType === "accumulator" && meta.name === strName;
  }

  async accumulator(accumulatorId) {
    const [did, name] = CheqdAccumulatorId.from(accumulatorId);
    const ids = ResourcesMap.fromItems(
      await this.resourcesMetadataBy(
        did,
        this.createAccumulatorMetadataFilter(name)
      )
    ).keys();

    if (!ids.length) {
      return null;
    }

    const acc = option(CheqdStoredAccumulator).from(
      (await this.resource(did, ids[ids.length - 1]))?.resource?.data
    );

    if (acc == null) {
      return null;
    }

    return new CheqdAccumulatorWithUpdateInfo(
      ids[0],
      ids[ids.length - 1],
      acc.accumulator
    );
  }

  async lastParamsId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      this.filterParamsMetadata
    );

    return res?.id;
  }

  async lastPublicKeyId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      this.filterPublicKeyMetadata
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
    end
  ) {
    const [did, name] = CheqdAccumulatorId.from(accumulatorId);

    const sortedIDs = Array.from(
      ResourcesMap.fromItems(
        await this.resourcesMetadataBy(
          did,
          this.createAccumulatorMetadataFilter(name)
        )
      ).keys()
    );

    const startIdx = sortedIDs.findIndex((id) => id === String(start));
    let endIdx;
    if (end != null) {
      endIdx = sortedIDs.findIndex((id) => id === String(end));

      if (!~endIdx) {
        throw new Error(
          `Accumulator \`${name}\` with version \`${end}\` doesn't exist`
        );
      }
    } else {
      endIdx = sortedIDs.length - 1;
    }

    const accumulators = await this.resources(
      did,
      sortedIDs.slice(startIdx, endIdx + 1)
    );

    for (const accumulator of accumulators) {
      const { additions = [], removals = [] } = accumulator.toJSON();

      const queriedWitnessInfo = new VBWitnessUpdateInfo(
        accumulator.witnessUpdateInfo.bytes
      );

      witness.updateUsingPublicInfoPostBatchUpdate(
        member,
        additions,
        removals,
        queriedWitnessInfo
      );
    }
  }
}
