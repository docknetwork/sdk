import { getStateChange } from '../../misc';
import { createDidSig } from '../utils';

import { DockDIDQualifier, DidMethodKeyQualifier } from '../constants';
import { withExtendedStaticProperties } from '../../inheritance';

/**
 * Either `did:dock:*` or `did:key:*`.
 */
class DockDidOrDidMethodKey {
  /**
   * Prefix to form the fully qualified string.
   *
   * @type {string}
   */
  static Qualifier;
  /**
   * @type {typeof this}
   */
  static DockDid;
  /**
   * @type {typeof this}
   */
  static DidMethodKey;

  /**
   * Checks whether provided string is qualified according to the caller class.
   * @param {string} did
   * @returns {boolean}
   */
  static isQualifiedString(did) {
    return this.Qualifier
      ? did.startsWith(this.Qualifier)
      : this.DockDid.isQualifiedString(did)
          || this.DidMethodKey.isQualifiedString(did);
  }

  /**
   * Instantiates `DockDid` or `DidMethodKey` from a fully qualified did string.
   * @param {string} did - fully qualified `dock:did:<SS58 DID>` or `dock:key:<BS58 public key>` string
   * @returns {DockDid|DidMethodKey}
   */
  static fromQualifiedString(did) {
    if (did.startsWith(DockDIDQualifier)) {
      return this.DockDid.fromQualifiedString(did);
    } else if (did.startsWith(DidMethodKeyQualifier)) {
      return this.DidMethodKey.fromQualifiedString(did);
    } else {
      throw new Error(
        `Unsupported did string: ${did}, expected either \`dock:did:<SS58 DID>\` or \`dock:key:<BS58 public key>\``,
      );
    }
  }

  /**
   * Instantiates `DockDid` or `DidMethodKey` from a did or did method key object received from the substrate side.
   * @param {object} did - substrate did or did method key
   * @returns {DockDid|DidMethodKey}
   */
  static fromSubstrateValue(did) {
    if (did.isDid) {
      return this.DockDid.fromSubstrateValue(did);
    } else if (did.isDidMethodKey) {
      return this.DidMethodKey.fromSubstrateValue(did);
    } else {
      throw new Error(`Invalid \`did:*\` provided: \`${JSON.stringify(did)}\``);
    }
  }

  /**
   * Attempts to instantiate `DockDid` or `DidMethodKey` from the provided object or string.
   *
   * @param {string|DockDid|DidMethodKey|object} did
   * @returns {DockDid|DidMethodKey}
   */
  static from(did) {
    if (!did) {
      throw new Error(`Invalid DID: ${did}`);
    } else if (typeof did === 'object') {
      if (did instanceof this) {
        return did;
      } else {
        return this.fromSubstrateValue(did);
      }
    } else if (typeof did === 'string') {
      if (this.Qualifier && !this.isQualifiedString(did)) {
        return this.fromUnqualifiedString(did);
      } else {
        return this.fromQualifiedString(did);
      }
    } else {
      throw new TypeError(
        `Unsupported DID value: \`${did}\` with type \`${typeof did}\`, expected a string or an object`,
      );
    }
  }

  /**
   * Extracts raw underlying value if it's `did:dock:*`, throws an error otherwise.
   */
  get asDid() {
    throw new Error('Not a `Did`');
  }

  /**
   *  Extracts raw underlying value if it's `did:key:*`, throws an error otherwise.
   */
  get asDidMethodKey() {
    throw new Error('Not a `DidMethodKey`');
  }

  /**
   *  Returns `true` if the underlying value is a `did:dock:*`.
   */
  get isDid() {
    return false;
  }

  /**
   *  Returns `true` if the underlying value is a `did:key:* `.
   */
  get isDidMethodKey() {
    return false;
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
  signStateChange(api, name, payload, keyRef) {
    const stateChange = getStateChange(api, name, payload);
    const keySignature = keyRef.sign(stateChange);

    return createDidSig(this, keyRef, keySignature);
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
  changeState(api, method, name, payload, keyRef) {
    const signature = this.signStateChange(api, name, payload, keyRef);

    return method(payload, signature);
  }

  /**
   * Converts underlying object to the `JSON` representation suitable for substrate JSON-RPC.
   */
  toJSON() {
    throw new Error('Unimplemented');
  }

  /**
   * Returns underlying value encoded according to the specification.
   */
  toEncodedString() {
    throw new Error('Unimplemented');
  }

  /**
   * Returns fully qualified `did:dock:*` encoded in SS58 or `did:key:*` encoded in BS58.
   */
  toString() {
    return this.toQualifiedEncodedString();
  }

  /**
   * Returns fully qualified `did:dock:*` encoded in SS58 or `did:key:*` encoded in BS58.
   */
  toQualifiedEncodedString() {
    return `${this.constructor.Qualifier}${this.toEncodedString()}`;
  }
}

export default withExtendedStaticProperties(
  ['Qualifier', 'fromUnqualifiedString'],
  DockDidOrDidMethodKey,
);
