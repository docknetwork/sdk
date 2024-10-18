import {
  CheqdDIDQualifier,
  CheqdDIDTestnetQualifier,
  CheqdDIDMainnetQualifier,
} from '../constants';
import { TypedEnum, withQualifier } from '../../../generic';
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
  static random() {
    return new this(this.Class.random());
  }

  toJSON() {
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
