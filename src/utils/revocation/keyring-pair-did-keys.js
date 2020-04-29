import DidKeys from './did-keys';

import {
  getSignatureFromKeyringPair,
} from '../misc';
import { getHexIdentifierFromDID } from '../did';

/**
 * Abstraction over a map of DID -> Keyring
 */
export default class KeyringPairDidKeys extends DidKeys {
  /**
   * Create a map of DID -> Signatures. This is used for authentication of the update
   * to the registry.
   * @param message
   * @returns {Map<any, any>}
   */
  getSignatures(message) {
    const signedProofs = new Map();
    this.map.forEach((pair, did) => {
      const sig = getSignatureFromKeyringPair(pair, message);
      // Convert the DID to hex if not already since the chain only accepts the DID hex-identifier.
      // This change could have been made while setting the DID but keeping the change least disruptive for now.
      signedProofs.set(getHexIdentifierFromDID(did), sig.toJSON());
    });
    return signedProofs;
  }
}
