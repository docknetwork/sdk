import { TypedStruct } from '../generic';
import { DockAccumulatorPublicKeyId } from './keys';
import { DockAccumulatorParamsId } from './params';

export class DockAccumulatorCounters extends TypedStruct {
  static Classes = {
    paramsCounter: DockAccumulatorParamsId,
    keyCounter: DockAccumulatorPublicKeyId,
  };
}
