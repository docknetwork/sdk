import { maybeToJSONString } from '../../utils';
import {
  option, TypedBytes, TypedStruct, withProp,
} from '../generic';
import {
  CurveType,
  CurveTypeBls12381,
} from '../offchain-signatures/curve-type';
import {
  CheqdAccumulatorParamsRef,
  CheqdMainnetAccumulatorParamsRef,
  CheqdTestnetAccumulatorParamsRef,
  DockAccumulatorParamsRef,
  DockOrCheqdAccumulatorParamsRef,
} from './keys';
import { AccumulatorParams } from './params';

export class AccumulatorPublicKey extends TypedStruct {
  static Params = AccumulatorParams;

  static Classes = {
    bytes: class Bytes extends TypedBytes {},
    paramsRef: option(DockOrCheqdAccumulatorParamsRef),
    curveType: CurveType,
  };

  constructor(bytes, paramsRef, curveType = new CurveTypeBls12381(), ...rest) {
    super(bytes, paramsRef, curveType, ...rest);
  }

  setParams(params) {
    const WithParams = withProp(
      this.constructor,
      'params',
      option(this.constructor.Params),
    );

    const withParams = WithParams.from(this);
    withParams.params = params;

    return withParams;
  }

  async withParams(paramsModule) {
    let params = null;
    if (this.paramsRef != null) {
      params = await paramsModule.getParams(...this.paramsRef);

      if (params == null) {
        throw new Error(
          `Parameters with reference (${maybeToJSONString(
            this.paramsRef,
          )}) not found on chain`,
        );
      }
    }

    return this.setParams(params);
  }
}

export class DockAccumulatorPublicKey extends withProp(
  AccumulatorPublicKey,
  'paramsRef',
  option(DockAccumulatorParamsRef),
) {}

export class CheqdAccumulatorPublicKey extends withProp(
  AccumulatorPublicKey,
  'paramsRef',
  option(CheqdAccumulatorParamsRef),
) {}

export class CheqdTestnetAccumulatorPublicKey extends withProp(
  CheqdAccumulatorPublicKey,
  'paramsRef',
  option(CheqdTestnetAccumulatorParamsRef),
) {}

export class CheqdMainnetAccumulatorPublicKey extends withProp(
  CheqdAccumulatorPublicKey,
  'paramsRef',
  option(CheqdMainnetAccumulatorParamsRef),
) {}
