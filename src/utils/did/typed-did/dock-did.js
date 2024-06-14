import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';
import { getHexIdentifier } from '../../codec';

import { validateDockDIDHexIdentifier } from '../utils';

import { DockDIDByteSize, DockDIDQualifier } from '../constants';
import DockDidOrDidMethodKey from './dock-did-or-did-method-key';

/**
 * `did:dock:*`
 */
export default class DockDid extends DockDidOrDidMethodKey {
  static Qualifier = DockDIDQualifier;

  /**
   * Instantiates `DockDid` using supplied 32-byte hex sequence.
   * @param {*} did
   */
  constructor(did) {
    super();
    validateDockDIDHexIdentifier(did);

    this.did = did;
  }

  /**
   * Generates a random DID.
   *
   * @returns {DockDid}
   */
  static random() {
    return new this(randomAsHex(DockDIDByteSize));
  }

  /**
   * Instantiates `DockDid` from a fully qualified did string.
   * @param {string} did - fully qualified `did:dock:*` string
   * @returns {DockDid}
   */
  static fromQualifiedString(did) {
    return new this(getHexIdentifier(did, DockDIDQualifier, DockDIDByteSize));
  }

  /**
   * Instantiates `DockDid` from a did object received from the substrate side.
   * @param {object} did - substrate did
   * @returns {DockDid}
   */
  static fromSubstrateValue(did) {
    return new this(getHexIdentifier(did.asDid, [], DockDIDByteSize));
  }

  get isDid() {
    return true;
  }

  get asDid() {
    return this.did;
  }

  toJSON() {
    return { Did: this.did };
  }

  toString() {
    return `${DockDIDQualifier}${this.asDid}`;
  }

  /**
   * Returns unqualified DID encoded as a `SS58` address.
   */
  toEncodedString() {
    return encodeAddress(this.asDid);
  }
}

DockDidOrDidMethodKey.DockDid = DockDid;
