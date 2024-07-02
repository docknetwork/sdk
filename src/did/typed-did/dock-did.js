import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { getHexIdentifier } from '../../utils/codec';

import { validateDockDIDHexIdentifier } from '../utils';

import { DockDIDByteSize, DockDIDQualifier } from '../constants';
import DockDidOrDidMethodKey from './dock-did-or-did-method-key';

/**
 * `did:dock:*`
 */
export default class DockDid extends DockDidOrDidMethodKey {
  static Qualifier = DockDIDQualifier;
  static Type = 'did';

  /**
   * Instantiates `DockDid` using supplied 32-byte hex sequence.
   * @param {*} did
   */
  constructor(did) {
    super(did);
    validateDockDIDHexIdentifier(did);
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
   * Instantiates `DockDid` from an unqualified did string.
   * @param {string} did - SS58-encoded or hex did.
   * @returns {DockDid}
   */
  static fromUnqualifiedString(did) {
    return new this(getHexIdentifier(did, '', DockDIDByteSize));
  }

  /**
   * Instantiates `DockDid` from a did object received from the substrate side.
   * @param {object} did - substrate did
   * @returns {DockDid}
   */
  static fromSubstrateValue(did) {
    return new this(u8aToHex(did.asDid));
  }

  get isDid() {
    return true;
  }

  get asDid() {
    return this.did;
  }

  /**
   * Returns fully qualified `did:dock:*` with did represented as a hex value.
   */
  toQualifiedHexString() {
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
