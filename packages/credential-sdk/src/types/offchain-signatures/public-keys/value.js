import {
  TypedBytes,
  TypedStruct,
  TypedNumber,
  option,
  withProp,
} from '../../generic';
import { CurveType, CurveTypeBls12381 } from '../curve-type';
import {
  BBDT16Params, BBSParams, BBSPlusParams, PSParams,
} from '../params';
import {
  CheqdMainnetOffchainSignatureParamsRef,
  CheqdOffchainSignatureParamsRef,
  CheqdTestnetOffchainSignatureParamsRef,
  DockOffchainSignatureParamsRef,
  DockOrCheqdOffchainSignatureParamsRef,
} from './ref';

export class OffchainSignaturePublicKeyValue extends TypedStruct {
  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    paramsRef: option(DockOrCheqdOffchainSignatureParamsRef),
    curveType: CurveType,
    participantId: option(TypedNumber),
  };

  constructor(
    bytes,
    paramsRef,
    curveType = new CurveTypeBls12381(),
    participantId = null,
    ...rest
  ) {
    super(bytes, paramsRef, curveType, participantId, ...rest);
  }
}

export class BBSPublicKeyValue extends OffchainSignaturePublicKeyValue {
  static Params = BBSParams;
}
export class BBSPlusPublicKeyValue extends OffchainSignaturePublicKeyValue {
  static Params = BBSPlusParams;
}
export class PSPublicKeyValue extends OffchainSignaturePublicKeyValue {
  static Params = PSParams;
}
export class BBDT16PublicKeyValue extends OffchainSignaturePublicKeyValue {
  static Params = BBDT16Params;
}

export class DockOffchainSignaturePublicKeyValue extends withProp(
  OffchainSignaturePublicKeyValue,
  'paramsRef',
  DockOffchainSignatureParamsRef,
) {}
export class CheqdOffchainSignaturePublicKeyValue extends withProp(
  OffchainSignaturePublicKeyValue,
  'paramsRef',
  CheqdOffchainSignatureParamsRef,
) {}
export class CheqdTestnetOffchainSignaturePublicKeyValue extends withProp(
  CheqdOffchainSignaturePublicKeyValue,
  'paramsRef',
  CheqdTestnetOffchainSignatureParamsRef,
) {}
export class CheqdMainnetOffchainSignaturePublicKeyValue extends withProp(
  CheqdOffchainSignaturePublicKeyValue,
  'paramsRef',
  CheqdMainnetOffchainSignatureParamsRef,
) {}
