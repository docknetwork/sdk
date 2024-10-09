import { TypedTuple, TypedNumber } from '../generic';
import { DockDidOrDidMethodKey } from '../did';

export class DockAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class DockAccumulatorParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}
