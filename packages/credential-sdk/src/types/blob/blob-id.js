import { encodeAsSS58, decodeFromSS58 } from '../../utils/ss58';
import { isHex } from '../../utils/bytes';
import {
  TypedBytes,
  TypedEnum,
  TypedUUID,
  sized,
  withFrom,
  withQualifier,
} from '../generic';
import { CheqdBlobQualifier, DockBlobQualifier } from './const';
import { CheqdMainnetDid, CheqdTestnetDid, DIDRef } from '../did';

export class BlobId extends withFrom(withQualifier(TypedEnum, true), (value, from) => {
  try {
    // eslint-disable-next-line no-use-before-define
    return DockBlobId.from(value);
  } catch {
    return from(value);
  }
}) {
  static Qualifier = 'blob:';

  toJSON() {
    return String(this);
  }
}

export class CheqdBlobIdValue extends withQualifier(DIDRef) {
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

export class DockBlobIdValue extends sized(withQualifier(TypedBytes)) {
  static Qualifier = DockBlobQualifier;

  static Size = 32;

  static fromUnqualifiedString(bytes) {
    return new this(isHex(bytes) ? bytes : decodeFromSS58(bytes));
  }

  toEncodedString() {
    return encodeAsSS58(this.value);
  }
}

export class CheqdBlobId extends BlobId {
  static Qualifier = CheqdBlobQualifier;

  static Class = CheqdBlobIdValue;

  static Type = 'cheqd';

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class DockBlobId extends BlobId {
  static Qualifier = DockBlobQualifier;

  static Class = DockBlobIdValue;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

BlobId.bindVariants(CheqdBlobId, DockBlobId);
