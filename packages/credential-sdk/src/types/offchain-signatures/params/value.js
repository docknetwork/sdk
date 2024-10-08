import { TypedBytes, TypedStruct, option } from '../../generic';
import { CurveType, CurveTypeBls12381 } from '../curve-type';

export class OffchainSignatureParamsValue extends TypedStruct {
  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    label: option(class Label extends TypedBytes {}),
    curveType: CurveType,
  };

  constructor(bytes, label, curveType = new CurveTypeBls12381()) {
    super(bytes, label, curveType);
  }
}
export class BBSParamsValue extends OffchainSignatureParamsValue {
  static Type = 'bbs';
}
export class BBSPlusParamsValue extends OffchainSignatureParamsValue {
  static Type = 'bbsPlus';
}
export class PSParamsValue extends OffchainSignatureParamsValue {
  static Type = 'ps';
}
