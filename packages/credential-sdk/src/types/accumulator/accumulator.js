import {
  TypedStruct,
  TypedNumber,
  option,
  ArrayOfByteArrays,
  ByteArray,
  TypedUUID,
} from '../generic';
import {
  DockAccumulatorPublicKeyRef,
  CheqdAccumulatorPublicKeyRef,
} from './keys';
import { createAccumulatorVariants } from './variants';

export const [
  DockAccumulatorCommon,
  DockAccumulator,
  DockUniversalAccumulator,
  DockKBUniversalAccumulator,
  DockPositiveAccumulator,
] = createAccumulatorVariants(DockAccumulatorPublicKeyRef);

export class DockAccumulatorWithUpdateInfo extends TypedStruct {
  static Classes = {
    createdAt: TypedNumber,
    lastUpdatedAt: TypedNumber,
    accumulator: DockAccumulator,
  };

  get created() {
    return this.createdAt;
  }

  get lastModified() {
    return this.lastUpdatedAt;
  }

  get type() {
    return this.accumulator.type;
  }

  get accumulated() {
    return this.accumulator.value.accumulated;
  }

  get keyRef() {
    return this.accumulator.value.keyRef;
  }
}

export const [
  CheqdAccumulatorCommon,
  CheqdAccumulator,
  CheqdUniversalAccumulator,
  CheqdKBUniversalAccumulator,
  CheqdPositiveAccumulator,
] = createAccumulatorVariants(CheqdAccumulatorPublicKeyRef);

export class CheqdAccumulatorWithUpdateInfo extends TypedStruct {
  static Classes = {
    createdAt: TypedUUID,
    lastUpdatedAt: TypedUUID,
    accumulator: CheqdAccumulator,
  };

  get created() {
    return this.createdAt;
  }

  get lastModified() {
    return this.lastUpdatedAt;
  }

  get type() {
    return this.accumulator.type;
  }

  get accumulated() {
    return this.accumulator.value.accumulated;
  }

  get keyRef() {
    return this.accumulator.value.keyRef;
  }
}

export class CheqdStoredAccumulator extends TypedStruct {
  static Classes = {
    accumulator: CheqdAccumulator,
    additions: option(ArrayOfByteArrays),
    removals: option(ArrayOfByteArrays),
    witnessUpdateInfo: option(ByteArray),
  };
}
