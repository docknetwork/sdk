import DockDidOrDidMethodKey from './dock-did-or-did-method-key';
import DockDid from './dock-did';
import DidMethodKey from "./did-method-key"; // eslint-disable-line

/**
 * Takes a DID string, gets the hexadecimal value of that and returns either the `DockDid` or `DidMethodKey` object.
 * @deprecated Use `DockDidOrDidMethodKey.from`/`DockDid.from`/`DidMethodKey.from` instead.
 * @todo remove `api` parameter
 *
 * @param {*} api - unused
 * @param {string|DockDid|DidMethodKey|object} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * `did:key:<BS58 public key>` or a 32 byte hex string
 * @return {string|DockDid|DidMethodKey} Returns a `string` or `DockDid` or `DidMethodKey` object.
 */
export function typedHexDID(_api, did) {
  return DockDidOrDidMethodKey.from(did);
}

/**
 * Create and return a fully qualified Dock DID, i.e. "did:dock:<SS58 string>"
 *
 * @returns {string} - The DID
 */
export const createNewDockDID = () => DockDid.random().toQualifiedEncodedString();
