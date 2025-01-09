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
import withFromDockId, {
  patchWithFromDock,
} from '../generic/with-from-dock-id';
import { CheqdBlobQualifier, DockBlobQualifier } from './const';
import { CheqdMainnetDid, CheqdTestnetDid, DidRef } from '../did';
import dockDidById from '../../utils/dock-did-by-id.json';

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

export class CheqdBlobIdValue extends withQualifier(DidRef) {
  static Qualifier = CheqdBlobQualifier;

  static Ident = withFromDockId(TypedUUID, DockBlobId, 'blob:cheqd:');

  static fromUnqualifiedString(str) {
    const lastColon = str.lastIndexOf(':');
    const did = `did:cheqd:${str.slice(0, lastColon)}`;
    const id = str.slice(lastColon + 1);

    return new this(did, id);
  }

  static cheqdDid(did) {
    return did.value;
  }

  toEncodedString() {
    const { did, value, constructor } = this;
    const cheqdDid = constructor.cheqdDid(did);

    let prefix = '';
    if (cheqdDid instanceof CheqdTestnetDid) {
      prefix = 'testnet';
    } else if (cheqdDid instanceof CheqdMainnetDid) {
      prefix = 'mainnet';
    } else {
      throw new Error(
        `Can't determine DID type: \`${cheqdDid(did)}\`, instance of \`${
          cheqdDid(did).constructor.name
        }\``,
      );
    }

    return `${prefix}:${did.toEncodedString()}:${value}`;
  }
}

export class CheqdTestnetBlobIdValue extends CheqdBlobIdValue {
  static Did = CheqdTestnetDid;

  static cheqdDid(did) {
    return did;
  }
}

export class CheqdMainnetBlobIdValue extends CheqdBlobIdValue {
  static Did = CheqdMainnetDid;

  static cheqdDid(did) {
    return did;
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

export class CheqdTestnetBlobId extends CheqdBlobId {
  static Class = CheqdTestnetBlobIdValue;
}

export class CheqdMainnetBlobId extends CheqdBlobId {
  static Class = CheqdMainnetBlobIdValue;
}

BlobId.bindVariants(CheqdBlobId, DockBlobId);

patchWithFromDock(CheqdBlobId, DockBlobId, dockDidById.blobs);
