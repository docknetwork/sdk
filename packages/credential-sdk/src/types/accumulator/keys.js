import {
  TypedTuple, TypedNumber, TypedUUID, anyOf,
} from '../generic';
import withFromDockId from '../generic/with-from-dock-id';
import {
  CheqdDLRRef,
  CheqdMainnetDid,
  CheqdTestnetDid,
  DockDidOrDidMethodKey,
  NamespaceDid,
} from '../did';
import { CheqdAccumulatorParamsId, DockAccumulatorParamsId } from './params';

export class DockAccumulatorPublicKeyId extends TypedNumber {}

export class DockAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, DockAccumulatorPublicKeyId];
}

export class DockAccumulatorParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, DockAccumulatorPublicKeyId];
}

export class CheqdAccumulatorPublicKeyId extends withFromDockId(
  TypedUUID,
  DockAccumulatorPublicKeyId,
  'cheqd:accumulator:public-key:',
) {}

export class CheqdAccumulatorPublicKeyRef extends CheqdDLRRef {
  static Id = CheqdAccumulatorPublicKeyId;
}

export class CheqdTestnetAccumulatorPublicKeyRef extends CheqdAccumulatorPublicKeyRef {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetAccumulatorPublicKeyRef extends CheqdAccumulatorPublicKeyRef {
  static Did = CheqdMainnetDid;
}

export class DockOrCheqdAccumulatorPublicKeyRef extends TypedTuple {
  static Classes = [
    NamespaceDid,
    anyOf(CheqdAccumulatorPublicKeyId, DockAccumulatorPublicKeyId),
  ];
}

export class CheqdAccumulatorParamsRef extends CheqdDLRRef {
  static Id = CheqdAccumulatorParamsId;
}

export class CheqdTestnetAccumulatorParamsRef extends CheqdAccumulatorParamsRef {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetAccumulatorParamsRef extends CheqdAccumulatorParamsRef {
  static Did = CheqdMainnetDid;
}

export class DockOrCheqdAccumulatorParamsRef extends TypedTuple {
  static Classes = [
    NamespaceDid,
    anyOf(DockAccumulatorParamsId, CheqdAccumulatorParamsId),
  ];
}
