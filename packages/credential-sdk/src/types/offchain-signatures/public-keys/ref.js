import { TypedTuple } from '../../generic';
import {
  DockDidValue,
  DockDidOrDidMethodKey,
  CheqdDLRRef,
  CheqdTestnetDid,
  CheqdMainnetDid,
} from '../../did/onchain/typed-did';
import { DockParamsId } from '../params/id';

export class DockOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [DockDidValue, DockParamsId];
}

export class DockOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, DockParamsId];
}

export class CheqdOffchainSignatureKeyRef extends CheqdDLRRef {}

export class CheqdTestnetOffchainSignatureKeyRef extends CheqdDLRRef {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetOffchainSignatureKeyRef extends CheqdDLRRef {
  static Did = CheqdMainnetDid;
}

export class CheqdOffchainSignatureParamsRef extends CheqdDLRRef {}

export class CheqdTestnetOffchainSignatureParamsRef extends CheqdDLRRef {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetOffchainSignatureParamsRef extends CheqdDLRRef {
  static Did = CheqdMainnetDid;
}
