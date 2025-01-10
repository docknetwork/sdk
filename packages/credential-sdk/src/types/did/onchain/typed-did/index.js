import { DidMethodKeyPublicKey, DidMethodKeySignature } from './did-method-key';
import DockDidValue, { DockDidSignature } from './dock-did-value';
import {
  TypedEnum,
  TypedTuple,
  TypedUUID,
  withQualifier,
} from '../../../generic';
import { CheqdDid, CheqdMainnetDid, CheqdTestnetDid } from './cheqd-did';
import {
  withExtendedStaticProperties,
  isHexWithGivenByteSize,
} from '../../../../utils';
import DidOrDidMethodKeySignature from './signature';

export class DockDidOrDidMethodKey extends withQualifier(TypedEnum, true) {
  /**
   * Instantiates a random `dock:did:*`.
   */
  static random() {
    return new this(this.Class.random());
  }

  signWith(keyPair, bytes) {
    return this.value.signWith(keyPair, bytes);
  }

  /**
   * Creates signature for the state change with supplied arguments.
   *
   * @param apiProvider
   * @param name
   * @param payload
   * @param keyRef
   * @returns {object}
   */
  async signStateChange(apiProvider, name, payload, keyRef) {
    const { LOG_STATE_CHANGE } = process.env;
    if (Number(LOG_STATE_CHANGE) || Boolean(LOG_STATE_CHANGE)) {
      console.dir(payload, { depth: null });
    }
    const bytes = await apiProvider.stateChangeBytes(name, payload);

    return this.signWith(keyRef, bytes);
  }

  /**
   * Creates a transaction that will modify the chain state.
   *
   * @param api
   * @param method
   * @param name
   * @param payload
   * @param keyRef
   */
  async changeState(api, method, name, payload, keyRef) {
    return await method(
      payload,
      await this.signStateChange(api, name, payload, keyRef),
    );
  }

  toString() {
    return String(this.value);
  }

  static fromApi(value) {
    if (value.isDock) {
      return super.from(value.asDock);
    } else {
      return super.fromApi(value);
    }
  }

  static fromJSON(json) {
    if (json?.dock) {
      return super.fromJSON({ did: json?.dock });
    } else {
      return super.fromJSON(json);
    }
  }

  static from(value) {
    if (isHexWithGivenByteSize(String(value), 32)) {
      // eslint-disable-next-line no-use-before-define
      return new DockDid(value);
    }

    // eslint-disable-next-line no-use-before-define
    if (value instanceof NamespaceDid) {
      return super.from(value.isDock ? { did: value.asDock } : value);
    } else {
      return super.from(value);
    }
  }
}

export class DockDid extends DockDidOrDidMethodKey {
  static Class = DockDidValue;

  toHex() {
    return this.value.toHex();
  }

  toQualifiedString() {
    return this.value.toQualifiedString();
  }
}

export class DidMethodKey extends DockDidOrDidMethodKey {
  static Class = DidMethodKeyPublicKey;

  static fromKeypair(keypair) {
    return new this(DidMethodKeyPublicKey.fromKeypair(keypair));
  }
}

DockDidOrDidMethodKey.bindVariants(DockDid, DidMethodKey);

export class NamespaceDid extends withQualifier(TypedEnum, true) {
  toCheqdPayload() {
    return String(this);
  }

  toJSON() {
    return String(this);
  }

  static fromApi(value) {
    if (value.isDid) {
      return super.from({ dock: value.asDid });
    } else {
      return super.fromApi(value);
    }
  }

  static fromJSON(json) {
    if (json?.did && Object.keys(json).length === 1) {
      return super.fromJSON({ dock: json.did });
    } else {
      return super.fromJSON(json);
    }
  }

  static from(value) {
    return super.from(
      value instanceof DockDidOrDidMethodKey && value.isDid
        ? { dock: value.asDid }
        : value,
    );
  }
}

export class DockNamespaceDid extends NamespaceDid {
  static Qualifier = 'did:dock:';

  static Type = 'dock';

  static Class = DockDidValue;
}
export class DidNamespaceKey extends NamespaceDid {
  static Qualifier = 'did:key:';

  static Type = 'didMethodKey';

  static Class = DidMethodKeyPublicKey;
}
export class CheqdNamespaceDid extends NamespaceDid {
  static Qualifier = 'did:cheqd:';

  static Type = 'cheqd';

  static Class = CheqdDid;
}

NamespaceDid.bindVariants(DockNamespaceDid, DidNamespaceKey, CheqdNamespaceDid);

for (const Class of [CheqdTestnetDid, CheqdMainnetDid]) {
  const fromFn = Class.from;

  Class.from = function from(value) {
    if (value instanceof DockDid || value instanceof DockNamespaceDid) {
      return new this(TypedUUID.fromDockIdent(value));
    } else {
      return fromFn.call(this, value);
    }
  };
}

export class DidRef extends withExtendedStaticProperties(
  ['Ident'],
  withQualifier(TypedTuple),
) {
  static Qualifier = '';

  static Did = NamespaceDid;

  static get Classes() {
    return [this.Did, this.Ident];
  }

  static random(did) {
    return new this(did, this.Ident.random());
  }

  get did() {
    return this[0];
  }

  get value() {
    return this[1];
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+):(.+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for DID reference: \`${str}\``);
    }

    const [, did, value] = match;
    return new this(did, value);
  }

  toEncodedString() {
    const { did, value } = this;

    return `${did}:${value}`;
  }

  toJSON() {
    return String(this);
  }
}

DidOrDidMethodKeySignature.bindVariants(
  DockDidSignature,
  DidMethodKeySignature,
);

export { DockDidValue, DidMethodKeyPublicKey };
export * from './cheqd-did';
