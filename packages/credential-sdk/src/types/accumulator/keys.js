import { TypedTuple, TypedNumber } from '../generic';
import { CheqdDLRRef, DockDidOrDidMethodKey } from '../did';

export class DockAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class DockAccumulatorParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class CheqdAccumulatorPublicKeyRef extends CheqdDLRRef {}

export class CheqdAccumulatorParamsRef extends CheqdDLRRef {}
