import { TypedTuple } from '../../generic';
import {
  DockDidValue,
  DockDidOrDidMethodKey,
  CheqdDid,
} from '../../did/onchain/typed-did';
import { CheqdParamsId, DockParamsId } from '../params/id';

export class DockOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [DockDidValue, DockParamsId];
}

export class DockOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, DockParamsId];
}

export class CheqdOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [CheqdDid, CheqdParamsId];
}

export class CheqdOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [CheqdDid, CheqdParamsId];
}
