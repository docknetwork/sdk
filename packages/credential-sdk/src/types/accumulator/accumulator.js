import {
  TypedStruct,
  TypedNumber,
  option,
  ArrayOfByteArrays,
  ByteArray,
  TypedUUID,
  withProp,
  withFrom,
  TypedArray,
} from "../generic";
import {
  DockAccumulatorPublicKeyRef,
  CheqdAccumulatorPublicKeyRef,
  CheqdTestnetAccumulatorPublicKeyRef,
  CheqdMainnetAccumulatorPublicKeyRef,
} from "./keys";
import { createAccumulatorVariants } from "./variants";

class TypedUUIDOrTypedNumber extends withFrom(TypedUUID, (value, from) => {
  try {
    return TypedNumber.from(value);
  } catch {
    return from(value);
  }
}) {}

export class AccumulatorUpdate extends TypedStruct {
  static Classes = {
    id: TypedUUIDOrTypedNumber,
    accumulated: ByteArray,
    additions: option(ArrayOfByteArrays),
    removals: option(ArrayOfByteArrays),
    witnessUpdateInfo: option(ByteArray),
  };
}

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

  set accumulated(newAccumulated) {
    this.accumulator.accumulated = newAccumulated;
  }

  get keyRef() {
    return this.accumulator.value.keyRef;
  }
}

export class DockAccumulatorHistory extends TypedStruct {
  static Classes = {
    created: DockAccumulatorWithUpdateInfo,
    updates: class AccumulatorUpdates extends TypedArray {
      static Class = AccumulatorUpdate;
    },
  };
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

  set accumulated(newAccumulated) {
    this.accumulator.value.accumulated = newAccumulated;
  }

  get keyRef() {
    return this.accumulator.value.keyRef;
  }
}

export const [
  CheqdTestnetAccumulatorCommon,
  CheqdTestnetAccumulator,
  CheqdTestnetUniversalAccumulator,
  CheqdTestnetKBUniversalAccumulator,
  CheqdTestnetPositiveAccumulator,
] = createAccumulatorVariants(CheqdTestnetAccumulatorPublicKeyRef);

export const [
  CheqdMainnetAccumulatorCommon,
  CheqdMainnetAccumulator,
  CheqdMainnetUniversalAccumulator,
  CheqdMainnetKBUniversalAccumulator,
  CheqdMainnetPositiveAccumulator,
] = createAccumulatorVariants(CheqdMainnetAccumulatorPublicKeyRef);

export class CheqdStoredAccumulator extends TypedStruct {
  static Classes = {
    accumulator: CheqdAccumulator,
    additions: option(ArrayOfByteArrays),
    removals: option(ArrayOfByteArrays),
    witnessUpdateInfo: option(ByteArray),
  };

  set accumulated(newAccumulated) {
    this.accumulator.accumulated = newAccumulated;
  }

  get accumulated() {
    return this.accumulator.accumulated;
  }
}

export class CheqdTestnetStoredAccumulator extends withProp(
  CheqdStoredAccumulator,
  "accumulator",
  CheqdTestnetAccumulator
) {}

export class CheqdMainnetStoredAccumulator extends withProp(
  CheqdStoredAccumulator,
  "accumulator",
  CheqdMainnetAccumulator
) {}

export class CheqdAccumulatorHistory extends TypedStruct {
  static Classes = {
    created: CheqdAccumulatorWithUpdateInfo,
    updates: class AccumulatorUpdates extends TypedArray {
      static Class = AccumulatorUpdate;
    },
  };
}

class CheqdAccumulatorPublicKeyRefOrDockAccumulatorPublicKeyRef extends withFrom(
  CheqdAccumulatorPublicKeyRef,
  (value, from) => {
    try {
      return from(value);
    } catch {
      return DockAccumulatorPublicKeyRef.from(value);
    }
  }
) {}

export const [
  AccumulatorCommon,
  Accumulator,
  UniversalAccumulator,
  KBUniversalAccumulator,
  PositiveAccumulator,
] = createAccumulatorVariants(
  CheqdAccumulatorPublicKeyRefOrDockAccumulatorPublicKeyRef
);
