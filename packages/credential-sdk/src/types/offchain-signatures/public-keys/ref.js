import { TypedTuple, TypedNumber, TypedUUID } from '../../generic';
import {
  DockDidValue,
  DockDidOrDidMethodKey,
  CheqdDid,
} from '../../did/onchain/typed-did';

export class DockOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [DockDidValue, TypedNumber];
}

export class DockOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, TypedNumber];
}

export class CheqdOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [CheqdDid, TypedUUID];
}

export class CheqdOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [CheqdDid, TypedUUID];
}
