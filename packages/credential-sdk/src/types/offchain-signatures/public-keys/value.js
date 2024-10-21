import {
  TypedBytes,
  TypedStruct,
  TypedNumber,
  option,
  Any,
} from '../../generic';
import { CurveType, CurveTypeBls12381 } from '../curve-type';
import {
  BBDT16Params, BBSParams, BBSPlusParams, PSParams,
} from '../params';

export class OffchainSignaturePublicKeyValue extends TypedStruct {
  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    paramsRef: option(Any),
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
