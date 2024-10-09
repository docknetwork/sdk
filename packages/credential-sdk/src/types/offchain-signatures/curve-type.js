import { Null, TypedEnum } from '../generic';

export class CurveType extends TypedEnum {}

export class CurveTypeBls12381 extends CurveType {
  static Class = Null;

  static Type = 'bls12381';
}

CurveType.bindVariants(CurveTypeBls12381);
