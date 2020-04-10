import {
  getSignatureFromKeyringPair
} from './misc';
import {getHexIdentifierFromDID} from './did';

// The revocation registry has id with the byte size `RevRegIdByteSize`
export const RevRegIdByteSize = 32;
// Each entry in revocation registry has byte size `RevEntryByteSize`
export const RevEntryByteSize = 32;

// Revocation policy that allows one of the pre-decided controllers to update the registry.
export class OneOfPolicy {
  constructor(controllers) {
    if (controllers === undefined) {
      this.controllers = new Set();
    } else {
      this.controllers = controllers;
    }
  }

  /**
   * Add a owner to the policy
   * @param ownerDID
   */
  addOwner(ownerDID) {
    this.controllers.add(ownerDID);
  }

  toJSON() {
    return {
      // Convert each onwer DID to hex identifier if not already
      OneOf: new Set([...this.controllers].map(getHexIdentifierFromDID))
    };
  }
}

// Abstraction over a map of DID -> Key
export class DidKeys {
  constructor(map) {
    this.map = map || new Map();
  }

  set(key, value) {
    this.map.set(key, value);
  }

  toMap() {
    return this.map;
  }

  getSignatures() {
    throw new Error('getSignatures method must be implemented in child class!');
  }
}

// Abstraction over a map of DID -> Keyring
export class KeyringPairDidKeys extends DidKeys {
  constructor(map) {
    super(map);
  }

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
