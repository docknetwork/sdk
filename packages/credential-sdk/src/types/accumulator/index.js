import { DIDRef } from "../did";
import { TypedBytes, TypedUUID, sized, withFrom } from "../generic";

export class AccumulatorId extends DIDRef {}

export class CheqdAccumulatorIdIdent extends TypedUUID {}

export class CheqdAccumulatorId extends AccumulatorId {
  static Ident = CheqdAccumulatorIdIdent;
}

export class DockAccumulatorIdIdent extends withFrom(
  sized(TypedBytes),
  // eslint-disable-next-line no-use-before-define
  (value, from) => (value instanceof DockAccumulatorId ? value[1] : from(value))
) {
  static Size = 32;
}

export class DockAccumulatorId extends AccumulatorId {
  static Ident = DockAccumulatorIdIdent;
}

export * from "./keys";
export * from "./params";
export * from "./public-key";
export * from "./accumulator";
export * from "./counters";
