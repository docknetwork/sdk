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
import { CheqdMainnetDid, CheqdTestnetDid, DidRef } from '../did';
import {
  DockStatusList2021Qualifier,
  CheqdStatusList2021Qualifier,
} from '../../vc/constants';
import dockDidById from '../../utils/dock-did-by-id.json';

export class StatusListCredentialId extends withFrom(
  withQualifier(TypedEnum, true),
  (value, from) => {
    try {
      // eslint-disable-next-line no-use-before-define
      return from(DockStatusListCredentialIdValue.from(value));
    } catch {
      return from(value);
    }
  },
) {
  static Qualifier = 'status-list2021:';

  toJSON() {
    return String(this);
  }
}

export class DockStatusListCredentialIdValue extends withFrom(
  sized(withQualifier(TypedBytes)),
  (
    value,
    from, // eslint-disable-next-line no-use-before-define
  ) => (value instanceof DockStatusListCredentialId ? value[1] : from(value)),
) {
  static Qualifier = DockStatusList2021Qualifier;

  static Size = 32;

  static fromUnqualifiedString(bytes) {
    return new this(bytes);
  }

  toEncodedString() {
    return this.value;
  }
}

export class DockStatusListCredentialId extends StatusListCredentialId {
  static Class = DockStatusListCredentialIdValue;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

export class CheqdStatusListCredentialIdValue extends withQualifier(DidRef) {
  static Qualifier = CheqdStatusList2021Qualifier;

  static Ident = withFromDockId(
    TypedUUID,
    DockStatusListCredentialId,
    'status-list2021:cheqd:',
  );

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
    const { cheqdDid } = constructor;

    let prefix = '';
    if (cheqdDid(did) instanceof CheqdTestnetDid) {
      prefix = 'testnet';
    } else if (cheqdDid(did) instanceof CheqdMainnetDid) {
      prefix = 'mainnet';
    } else {
      throw new Error(
        `Can't determine DID type: \`${cheqdDid(did)}\`, instance of \`${
          cheqdDid(did).constructor.name
        }\``,
      );
    }

    return `${prefix}:${cheqdDid(did).toEncodedString()}:${value}`;
  }
}

class CheqdTestnetStatusListCredentialIdValue extends CheqdStatusListCredentialIdValue {
  static Did = CheqdTestnetDid;

  static cheqdDid(did) {
    return did;
  }
}

class CheqdMainnetStatusListCredentialIdValue extends CheqdStatusListCredentialIdValue {
  static Did = CheqdMainnetDid;

  static cheqdDid(did) {
    return did;
  }
}

export class CheqdStatusListCredentialId extends StatusListCredentialId {
  static Class = CheqdStatusListCredentialIdValue;

  static Type = 'cheqd';

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class CheqdTestnetStatusListCredentialId extends CheqdStatusListCredentialId {
  static Class = CheqdTestnetStatusListCredentialIdValue;
}

export class CheqdMainnetStatusListCredentialId extends CheqdStatusListCredentialId {
  static Class = CheqdMainnetStatusListCredentialIdValue;
}

StatusListCredentialId.bindVariants(
  CheqdStatusListCredentialId,
  DockStatusListCredentialId,
);

patchWithFromDock(
  CheqdStatusListCredentialId,
  DockStatusListCredentialId,
  dockDidById.statusLists,
);
