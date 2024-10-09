import {
  option, TypedBytes, TypedStruct, Any, withProp,
} from '../generic';
import {
  CurveType,
  CurveTypeBls12381,
} from '../offchain-signatures/curve-type';
import { DockAccumulatorParamsRef } from './keys';
import { AccumulatorParams } from './params';

export class AccumulatorPublicKey extends TypedStruct {
  static Params = AccumulatorParams;

  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    paramsRef: option(Any),
    curveType: CurveType,
  };

  constructor(bytes, paramsRef, curveType = new CurveTypeBls12381(), ...rest) {
    super(bytes, paramsRef, curveType, ...rest);
  }
}

export class DockAccumulatorPublicKey extends withProp(
  AccumulatorPublicKey,
  'paramsRef',
  option(DockAccumulatorParamsRef),
) {}
