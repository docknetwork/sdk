import { TypedStruct, TypedNumber } from '../generic';

export class DockAccumulatorCounters extends TypedStruct {
  static Classes = {
    paramsCounter: class ParamsCounter extends TypedNumber {},
    keyCounter: class KeyCounter extends TypedNumber {},
  };
}
