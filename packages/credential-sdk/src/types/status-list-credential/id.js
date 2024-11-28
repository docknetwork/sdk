import { isHex } from '../../utils/bytes';
import {
  TypedBytes,
  TypedEnum,
  TypedUUID,
  sized,
  withFrom,
  withQualifier,
} from '../generic';
import { CheqdMainnetDid, CheqdTestnetDid, DidRef } from '../did';
import { DockStatusList2021Qualifier, CheqdStatusList2021Qualifier } from '../../vc/constants';

export class StatusListCredentialId extends withFrom(
  withQualifier(TypedEnum, true),
  (value, from) => {
    try {
      // eslint-disable-next-line no-use-before-define
      return DockStatusListCredentialId.from(value);
    } catch {
      return from(value);
    }
  },
) {
  static Qualifier = 'status-list2021';

  toJSON() {
    return String(this);
  }
}

export class CheqdStatusListCredentialIdValue extends withQualifier(DidRef) {
  static Qualifier = CheqdStatusList2021Qualifier;

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

export class DockStatusListCredentialIdValue extends sized(withQualifier(TypedBytes)) {
  static Qualifier = DockStatusList2021Qualifier;

  static Size = 32;

  static fromUnqualifiedString(bytes) {
    return new this(bytes);
  }

  toEncodedString() {
    return this.value;
  }
}

export class CheqdStatusListCredentialId extends StatusListCredentialId {
  static Qualifier = CheqdStatusList2021Qualifier;

  static Class = CheqdStatusListCredentialIdValue;

  static Type = 'cheqd';

  static random(did) {
    return new this(this.Class.random(did));
  }
}

export class DockStatusListCredentialId extends StatusListCredentialId {
  static Qualifier = DockStatusList2021Qualifier;

  static Class = DockStatusListCredentialIdValue;

  static Type = 'dock';

  static random() {
    return new this(this.Class.random());
  }
}

StatusListCredentialId.bindVariants(CheqdStatusListCredentialId, DockStatusListCredentialId);
