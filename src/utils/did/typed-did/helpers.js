import { getHexIdentifier, isHexWithGivenByteSize } from '../../codec';

import DockDidOrDidMethodKey from './dock-did-or-did-method-key';
import DockDid from './dock-did';
import DidMethodKey from './did-method-key'; // eslint-disable-line

import { DockDIDQualifier, DockDIDByteSize } from '../constants';

/**
 * Takes a DID string, gets the hexadecimal value of that and returns either the `DockDid` or `DidMethodKey` object.
 * @param {ApiPromise} api
 * @param {string|DockDid|DidMethodKey} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * `did:key:<BS58 public key>` or a 32 byte hex string
 * @return {string|DockDid|DidMethodKey} Returns a `string` or `DockDid` or `DidMethodKey` object.
 */
export function typedHexDID(api, did) {
  if (api.specVersion < 50) {
    return getHexIdentifier(did, DockDIDQualifier, DockDIDByteSize);
  }

  if (did instanceof DockDidOrDidMethodKey) {
    return did;
  } else {
    return DockDidOrDidMethodKey.fromString(String(did));
  }
}

/**
 * Gets the hexadecimal value of the given DID received from the substrate side.
 * @param {ApiPromise} api
 * @param {object} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string|DockDid|DidMethodKey} Returns a `string` or `DockDid` or `DidMethodKey` object.
 */
export function typedHexDIDFromSubstrate(api, did) {
  if (api.specVersion < 50) {
    return getHexIdentifier(did, DockDIDQualifier, DockDIDByteSize);
  } else {
    return DockDidOrDidMethodKey.fromSubstrate(did);
  }
}

/**
 * Create and return a fully qualified Dock DID, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The DID
 */
export const createNewDockDID = () => DockDid.random().toQualifiedString();

/**
 * Temporary solution for the DID's backward compatibility.
 *
 * --------------------------------------------------------
 */
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'asDid', {
  get() {
    if (this.isDid) {
      return String(this);
    } else {
      throw new Error('Not a `Did`');
    }
  },
});
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'isDid', {
  get() {
    return isHexWithGivenByteSize(String(this), DockDIDByteSize);
  },
});
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'toQualifiedString', {
  get() {
    return new DockDid(this.asDid).toQualifiedString();
  },
});

/**
 * --------------------------------------------------------
 */
