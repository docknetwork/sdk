import { CheqdMainnetDid, CheqdTestnetDid, DidRef } from '../did';
import {
  TypedBytes,
  TypedEnum,
  TypedUUID,
  sized,
  withFrom,
  withQualifier,
} from '../generic';

export class AccumulatorId extends withFrom(
  withQualifier(TypedEnum, true),
  (value, from) => {
    try {
      // eslint-disable-next-line no-use-before-define
      return from(DockAccumulatorIdValue.from(value));
    } catch {
      return from(value);
    }
  },
) {
  static Qualifier = 'accumulator:';

  toJSON() {
    return String(this);
  }
}

export class CheqdAccumulatorIdValue extends withQualifier(DidRef) {
  static Qualifier = 'accumulator:cheqd:';

  static Ident = TypedUUID;

  static fromUnqualifiedString(str) {
    const lastColon = str.lastIndexOf(':');
    const did = `did:cheqd:${str.slice(0, lastColon)}`;
    const id = str.slice(lastColon + 1);

    return new this(did, id);
  }

  toEncodedString() {
    const { did, value } = this;
    let prefix = '';
    if (did.value instanceof CheqdTestnetDid) {
      prefix = 'testnet';
    } else if (did.value instanceof CheqdMainnetDid) {
      prefix = 'mainnet';
    }

    return `${prefix}:${did.toEncodedString()}:${value}`;
  }
}

export class DockAccumulatorIdValue extends sized(TypedBytes) {
  static Size = 32;
}

export class DockAccumulatorIdIdent extends withQualifier(
  withFrom(
    sized(TypedBytes),
    // eslint-disable-next-line no-use-before-define
    (value, from) => (value instanceof DockAccumulatorId ? value[1] : from(value)),
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

export class CheqdAccumulatorId extends AccumulatorId {
  static Class = CheqdAccumulatorIdValue;

  static Type = 'cheqd';

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class DockAccumulatorId extends AccumulatorId {
  static Class = DockAccumulatorIdIdent;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

AccumulatorId.bindVariants(CheqdAccumulatorId, DockAccumulatorId);
