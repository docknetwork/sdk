import {
  CheqdDIDQualifier,
  CheqdDIDTestnetQualifier,
  CheqdDIDMainnetQualifier,
} from '../constants';
import {
  TypedEnum,
  TypedTuple,
  withFrom,
  withQualifier,
} from '../../../generic';
import TypedUUID from '../../../generic/typed-uuid';

/**
 * `did:cheqd:*`
 */
export class CheqdDidValue extends withQualifier(TypedUUID) {
  static Qualifier = CheqdDIDQualifier;

  toEncodedString() {
    return this.value;
  }

  static fromUnqualifiedString(str) {
    return new this(str);
  }
}

export class CheqdTestnetDidValue extends CheqdDidValue {
  static Qualifier = CheqdDIDTestnetQualifier;
}

export class CheqdMainnetDidValue extends CheqdDidValue {
  static Qualifier = CheqdDIDMainnetQualifier;
}

export class CheqdDid extends withQualifier(TypedEnum, true) {
  get Qualifier() {
    return this.Class?.Qualifier;
  }

  static random(network) {
    if (this.Class != null) {
      return new this(this.Class.random());
    } else if (network === 'testnet') {
      // eslint-disable-next-line no-use-before-define
      return CheqdTestnetDid.random();
    } else if (network === 'mainnet') {
      // eslint-disable-next-line no-use-before-define
      return CheqdMainnetDid.random();
    } else {
      throw new Error(
        `Unknown network provided: \`${network}\`, expected \`mainnet\` or \`testnet\``,
      );
    }
  }

  toJSON() {
    return String(this);
  }

  toCheqdPayload() {
    return String(this);
  }
}

export class CheqdTestnetDid extends CheqdDid {
  static Class = CheqdTestnetDidValue;

  static Type = 'testnet';
}
export class CheqdMainnetDid extends CheqdDid {
  static Class = CheqdMainnetDidValue;

  static Type = 'mainnet';
}

CheqdDid.bindVariants(CheqdTestnetDid, CheqdMainnetDid);

export class CheqdDLRRef extends withFrom(
  TypedTuple,
  function from(value, fromFn) {
    if (typeof value === 'string') {
      const lastColon = value.lastIndexOf(':');

      return new this(value.slice(0, lastColon), value.slice(lastColon + 1));
    } else {
      return fromFn(value);
    }
  },
) {
  static Classes = [CheqdDid, TypedUUID];

  toString() {
    return `${this[0]}:${this[1]}`;
  }

  toJSON() {
    return String(this);
  }
}
