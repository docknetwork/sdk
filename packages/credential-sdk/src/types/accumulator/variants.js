import {
  TypedBytes, TypedEnum, TypedNumber, TypedStruct,
} from '../generic';

export const createAccumulatorVariants = (keyRef) => {
  class AccumulatorCommon extends TypedStruct {
    static Classes = {
      accumulated: class Accumulated extends TypedBytes {},
      keyRef,
    };
  }

  class UniversalAccumulatorValue extends TypedStruct {
    static Type = 'universal';

    static Classes = {
      common: AccumulatorCommon,
      maxSize: TypedNumber,
    };

    get accumulated() {
      return this.common.accumulated;
    }

    set accumulated(newAccumulated) {
      this.common.accumulated = newAccumulated;
    }

    get keyRef() {
      return this.common.keyRef;
    }
  }

  class Accumulator extends TypedEnum {
    get keyRef() {
      return this.value.keyRef;
    }

    get accumulated() {
      return this.value.accumulated;
    }

    set accumulated(newAccumulated) {
      this.value.accumulated = newAccumulated;
    }
  }

  class UniversalAccumulator extends Accumulator {
    static Type = 'universal';

    static Class = UniversalAccumulatorValue;
  }
  class KBUniversalAccumulator extends Accumulator {
    static Type = 'kbUniversal';

    static Class = AccumulatorCommon;
  }
  class PositiveAccumulator extends Accumulator {
    static Type = 'positive';

    static Class = AccumulatorCommon;
  }

  Accumulator.bindVariants(
    UniversalAccumulator,
    KBUniversalAccumulator,
    PositiveAccumulator,
  );

  return [
    AccumulatorCommon,
    Accumulator,
    UniversalAccumulator,
    KBUniversalAccumulator,
    PositiveAccumulator,
  ];
};
