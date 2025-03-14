import { valueBytes } from '../../utils';
import { CheqdDidRef, CheqdMainnetDid, CheqdTestnetDid } from '../did';
import {
  TypedBytes,
  TypedEnum,
  TypedUUID,
  sized,
  withFrom,
  withQualifier,
} from '../generic';
import withFromDockId, {
  patchWithFromDock,
} from '../generic/with-from-dock-id';
import dockDidById from '../../utils/mappings/dock-did-by-id';

export class DockAccumulatorIdValue extends sized(TypedBytes) {
  static Size = 32;
}

export class AccumulatorId extends withFrom(
  withQualifier(TypedEnum, true),
  (valueWithUncheckedPrefix, from) => {
    const value = typeof valueWithUncheckedPrefix === 'string'
      && valueWithUncheckedPrefix.startsWith('dock:accumulator:')
      ? `accumulator:dock:${valueWithUncheckedPrefix.slice(17)}`
      : valueWithUncheckedPrefix;

    try {
      // eslint-disable-next-line no-use-before-define
      return from(DockAccumulatorIdValue.from(value));
    } catch {
      return from(value);
    }
  },
) {
  static Qualifier = 'accumulator:';
}

export class DockAccumulatorIdIdent extends withQualifier(
  withFrom(
    sized(TypedBytes),
    // eslint-disable-next-line no-use-before-define
    (value, from) => (value instanceof DockAccumulatorId ? valueBytes(value) : from(value)),
  ),
) {
  static Qualifier = 'accumulator:dock:';

  static Size = 32;

  static fromUnqualifiedString(bytes) {
    return new this(bytes);
  }

  toEncodedString() {
    return this.value;
  }
}

export class DockAccumulatorId extends AccumulatorId {
  static Class = DockAccumulatorIdIdent;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

export class CheqdAccumulatorIdValue extends CheqdDidRef {
  static Qualifier = 'accumulator:cheqd:';

  static Ident = withFromDockId(
    TypedUUID,
    DockAccumulatorId,
    'accumulator:cheqd:',
  );
}

export class CheqdTestnetAccumulatorIdValue extends CheqdAccumulatorIdValue {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetAccumulatorIdValue extends CheqdAccumulatorIdValue {
  static Did = CheqdMainnetDid;
}

export class CheqdAccumulatorId extends AccumulatorId {
  static Class = CheqdAccumulatorIdValue;

  static Type = 'cheqd';

  toJSON() {
    return String(this);
  }

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class CheqdTestnetAccumulatorId extends CheqdAccumulatorId {
  static Class = CheqdTestnetAccumulatorIdValue;
}

export class CheqdMainnetAccumulatorId extends CheqdAccumulatorId {
  static Class = CheqdMainnetAccumulatorIdValue;
}

AccumulatorId.bindVariants(CheqdAccumulatorId, DockAccumulatorId);

patchWithFromDock(
  CheqdAccumulatorId,
  DockAccumulatorId,
  dockDidById.accumulators,
);
