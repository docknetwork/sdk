import { DidMethodKeyPublicKey } from './did-method-key';
import DockDidValue from './dock-did-value';
import { TypedEnum, withQualifier } from '../../../generic';
import { CheqdDid } from './cheqd-did';

export const DockDidOrDidMethodKey = withQualifier(
  class DockDidOrDidMethodKey extends TypedEnum {
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
     * @param api
     * @param name
     * @param payload
     * @param keyRef
     * @returns {object}
     */
    async signStateChange(apiProvider, name, payload, keyRef) {
      // eslint-disable-next-line no-param-reassign
      payload.nonce ??= 1 + (await apiProvider.nonce(this));
      if (
        Number(process.env.LOG_STATE_CHANGE)
        || Boolean(process.env.LOG_STATE_CHANGE)
      ) {
        console.log('State change:', name, '=>', payload);
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
      const signature = await this.signStateChange(api, name, payload, keyRef);
      return await method(payload, signature);
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
      // eslint-disable-next-line no-use-before-define
      if (value instanceof NamespaceDid) {
        return super.from(value.isDock ? { did: value.asDock } : value);
      } else {
        return super.from(value);
      }
    }
  },
  true,
);

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

class DockDidValueToString extends DockDidValue {
  toJSON() {
    return String(this);
  }
}

class DidMethodKeyPublicKeyToString extends DidMethodKeyPublicKey {
  toJSON() {
    return String(this);
  }
}

export const NamespaceDid = withQualifier(
  class extends TypedEnum {
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
  },
  true,
);

class DockNamespaceDid extends NamespaceDid {
  static Type = 'dock';

  static Class = DockDidValueToString;
}
class DidNamespaceKey extends NamespaceDid {
  static Type = 'didMethodKey';

  static Class = DidMethodKeyPublicKeyToString;
}
class CheqdNamespaceDid extends NamespaceDid {
  static Type = 'cheqd';

  static Class = CheqdDid;
}

NamespaceDid.bindVariants(DockNamespaceDid, DidNamespaceKey, CheqdNamespaceDid);

export { DockDidValue, DidMethodKeyPublicKey };
export * from './cheqd-did';
