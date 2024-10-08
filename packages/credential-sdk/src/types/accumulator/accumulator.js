import { TypedStruct, TypedNumber } from '../generic';
import { DockAccumulatorPublicKeyRef } from './keys';
import { createAccumulatorVariants } from './variants';

export const [
  DockAccumulatorCommon,
  DockAccumulator,
  DockUniversalAccumulator,
  DockKBUniversalAccumulator,
  DockPositiveAccumulator,
] = createAccumulatorVariants(DockAccumulatorPublicKeyRef);

export class DockAccumulatorWithUpdateInfo extends TypedStruct {
  static Classes = {
    createdAt: TypedNumber,
    lastUpdatedAt: TypedNumber,
    accumulator: DockAccumulator,
  };

  get created() {
    return this.createdAt;
  }

  get lastModified() {
    return this.lastUpdatedAt;
  }

  get type() {
    return this.accumulator.type;
  }

  get accumulated() {
    return this.accumulator.value.accumulated;
  }

  get keyRef() {
    return this.accumulator.value.keyRef;
  }
}
