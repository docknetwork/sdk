import { TypedTuple, TypedNumber, TypedUUID } from '../generic';
import { CheqdDid, DockDidOrDidMethodKey } from '../did';

export class DockAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class DockAccumulatorParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class CheqdAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [CheqdDid, TypedUUID];
}

export class CheqdAccumulatorParamsRef extends TypedTuple {
  static Classes = [CheqdDid, TypedUUID];
}
