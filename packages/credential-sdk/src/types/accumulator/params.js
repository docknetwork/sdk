import { option, TypedBytes, TypedStruct } from '../generic';
import {
  CurveType,
  CurveTypeBls12381,
} from '../offchain-signatures/curve-type';

export class AccumulatorParams extends TypedStruct {
  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    label: option(class Label extends TypedBytes {}),
    curveType: CurveType,
  };

  constructor(bytes, label, curveType = new CurveTypeBls12381()) {
    super(bytes, label, curveType);
  }
}
