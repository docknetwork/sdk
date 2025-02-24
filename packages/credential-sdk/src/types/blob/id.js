import { encodeAsSS58, decodeFromSS58 } from '../../utils/encoding';
import { isHex } from '../../utils/bytes';
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
import { CheqdBlobQualifier, DockBlobQualifier } from './const';
import { CheqdDidRef, CheqdMainnetDid, CheqdTestnetDid } from '../did';
import dockDidById from '../../utils/fixtures/dock-did-by-id';

export class BlobId extends withFrom(
  withQualifier(TypedEnum, true),
  (value, from) => {
    try {
      // eslint-disable-next-line no-use-before-define
      return DockBlobId.from(value);
    } catch {
      return from(value);
    }
  },
) {
  static Qualifier = 'blob:';

  toJSON() {
    return String(this);
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

export class DockBlobId extends BlobId {
  static Qualifier = DockBlobQualifier;

  static Class = DockBlobIdValue;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

export class CheqdBlobIdValue extends CheqdDidRef {
  static Qualifier = CheqdBlobQualifier;

  static Ident = withFromDockId(TypedUUID, DockBlobId, 'blob:cheqd:');
}

export class CheqdTestnetBlobIdValue extends CheqdBlobIdValue {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetBlobIdValue extends CheqdBlobIdValue {
  static Did = CheqdMainnetDid;
}

export class CheqdBlobId extends BlobId {
  static Qualifier = CheqdBlobQualifier;

  static Class = CheqdBlobIdValue;

  static Type = 'cheqd';

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class CheqdTestnetBlobId extends CheqdBlobId {
  static Class = CheqdTestnetBlobIdValue;
}

export class CheqdMainnetBlobId extends CheqdBlobId {
  static Class = CheqdMainnetBlobIdValue;
}

BlobId.bindVariants(CheqdBlobId, DockBlobId);

patchWithFromDock(CheqdBlobId, DockBlobId, dockDidById.blobs);
