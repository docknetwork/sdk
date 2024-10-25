import { DIDRef } from "../did";
import {
  TypedBytes,
  TypedEnum,
  TypedUUID,
  sized,
  withFrom,
  withQualifier,
} from "../generic";

export class AccumulatorId extends withQualifier(TypedEnum, true) {
  static Qualifier = "accumulator:";

  toJSON() {
    return String(this);
  }
}

export class CheqdAccumulatorIdValue extends withQualifier(DIDRef) {
  static Qualifier = "accumulator:cheqd:";

  static Ident = TypedUUID;
}

export class DockAccumulatorIdValue extends sized(TypedBytes) {
  static Size = 32;
}

export class DockAccumulatorIdIdent extends withQualifier(
  withFrom(
    sized(TypedBytes),
    // eslint-disable-next-line no-use-before-define
    (value, from) =>
      value instanceof DockAccumulatorId ? value[1] : from(value)
  )
) {
  static Qualifier = "accumulator:dock:";
}

export class CheqdAccumulatorId extends AccumulatorId {
  static Class = CheqdAccumulatorIdValue;

  static Type = "cheqd";
}

export class DockAccumulatorId extends AccumulatorId {
  static Class = DockAccumulatorIdIdent;

  static Type = "dock";
}

AccumulatorId.bindVariants(CheqdAccumulatorId, DockAccumulatorId);

export * from "./keys";
export * from "./params";
export * from "./public-key";
export * from "./accumulator";
export * from "./counters";
