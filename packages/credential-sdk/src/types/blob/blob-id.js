import { encodeAsSS58, decodeFromSS58 } from '../../utils/ss58';
import { isHex } from '../../utils/bytes';
import { TypedBytes, sized, withQualifier } from '../generic';
import { DockBlobQualifier } from './const';

export class BlobId extends withQualifier(TypedBytes) {
  static Qualifier = DockBlobQualifier;

  static fromUnqualifiedString(bytes) {
    return new this(isHex(bytes) ? bytes : decodeFromSS58(bytes));
  }

  toEncodedString() {
    return encodeAsSS58(this.value);
  }
}

export class DockBlobId extends sized(BlobId) {
  static Size = 32;
}

/*
export class BlobIdIdent extends withQualifier(TypedBytes) {
  static Qualifier = DockBlobQualifier;

  static fromUnqualifiedString(bytes) {
    return new this(isHex(bytes) ? bytes : decodeFromSS58(bytes));
  }

  toEncodedString() {
    return encodeAsSS58(this.value);
  }
}

export class BlobId extends IdentRef {}

export class CheqdBlobIdIdent extends withFrom(sized(BlobIdIdent), (value, from) => value instanceof CheqdBlobId ? value[1]: from(value)) {
  static Qualifier = DockBlobQualifier;

  static fromUnqualifiedString(bytes) {
    return new this(bytes);
  }

  toEncodedString() {
    return this.value;
  }
}

export class CheqdBlobId extends BlobId {
  static Ident = CheqdBlobIdIdent;
}

export class DockBlobIdIdent extends withFrom(sized(BlobIdIdent), (value, from) => value instanceof DockBlobId ? value[1]: from(value)) {
  static Size = 32;
}

export class DockBlobId extends BlobId {
  static Ident = DockBlobIdIdent;
}

export class DockBlobId extends sized(BlobId) {
  static Size = 32;
}
*/
