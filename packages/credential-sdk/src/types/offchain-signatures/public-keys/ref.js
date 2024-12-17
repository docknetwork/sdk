import { TypedTuple } from "../../generic";
import {
  DockDidValue,
  DockDidOrDidMethodKey,
  CheqdDLRRef,
} from "../../did/onchain/typed-did";
import { DockParamsId } from "../params/id";

export class DockOffchainSignatureKeyRef extends TypedTuple {
  static Classes = [DockDidValue, DockParamsId];
}

export class DockOffchainSignatureParamsRef extends TypedTuple {
  static Classes = [DockDidOrDidMethodKey, DockParamsId];
}

export class CheqdOffchainSignatureKeyRef extends CheqdDLRRef {}

export class CheqdOffchainSignatureParamsRef extends CheqdDLRRef {}
