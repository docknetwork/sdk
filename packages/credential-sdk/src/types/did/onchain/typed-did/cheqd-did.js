import {
  CheqdDIDQualifier,
  CheqdDIDTestnetQualifier,
  CheqdDIDMainnetQualifier,
} from '../constants';
import { withQualifier } from '../../../generic';
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
