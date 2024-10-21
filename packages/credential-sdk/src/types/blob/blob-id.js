import { encodeAsSS58, decodeFromSS58 } from '../../utils/ss58';
import { isHex } from '../../utils/bytes';
import {
  TypedBytes, TypedUUID, sized, withQualifier,
} from '../generic';
import { CheqdBlobQualifier, DockBlobQualifier } from './const';
import { CheqdMainnetDid, CheqdTestnetDid, DIDRef } from '../did';

export class CheqdBlobId extends DIDRef {
  static Qualifier = CheqdBlobQualifier;

  static Ident = TypedUUID;

  toEncodedString() {
    let prefix = '';
    if (this[0].value instanceof CheqdTestnetDid) {
      prefix = 'testnet';
    } else if (this[0].value instanceof CheqdMainnetDid) {
      prefix = 'mainnet';
    }

    return `${prefix}:${this.value}`;
  }
}

export class DockBlobId extends sized(withQualifier(TypedBytes)) {
  static Size = 32;

  static Qualifier = DockBlobQualifier;

  static fromUnqualifiedString(bytes) {
    return new this(isHex(bytes) ? bytes : decodeFromSS58(bytes));
  }

  toEncodedString() {
    return encodeAsSS58(this.value);
  }
}
