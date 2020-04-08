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
    this.controllers = controllers;
  }

  toJSON() {
    return {
      OneOf: this.controllers
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

/**
 * Create a new registry on chain with `OneOfPolicy` policy. It accepts a single owner.
 * @param dockAPI
 * @param ownerDID - The owner DID can be full or just the hex identifier
 * @param registryId
 * @param addOnly - whether the registry is add only, i.e. revocations cannot be undone.
 * @returns {Promise<void>}
 */
export async function createOneOfPolicyRevRegOnChain(dockAPI, ownerDID, registryId, addOnly) {
  // Convert DID to hex if not already
  const ownerDIDHex = getHexIdentifierFromDID(ownerDID);

  // Create owner set
  const owners = new Set();
  owners.add(ownerDIDHex);

  // Create a registry policy
  const policy = new OneOfPolicy(owners);

  const transaction = dockAPI.revocation.newRegistry(registryId, policy, addOnly);
  await dockAPI.sendTransaction(transaction);
}

/**
 * Internal helper to avoid code duplication while updating the revocation registry by revoking or unrevoking a credential.
 * @param updateFunc - A function that's called in the context of `dockAPI.revocation` to send an extrinsic. Is either
 * `dockAPI.revocation.revoke` or `dockAPI.revocation.unrevoke`
 * @param dockAPI
 * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
 * @param registryId - The registry id being updated
 * @param revId - The revocation id being revoked or unrevoked
 * @returns {Promise<void>}
 */
async function updateRevReg(updateFunc, dockAPI, didKeys, registryId, revId) {
  const lastModified = await dockAPI.revocation.getBlockNoForLastChangeToRegistry(registryId);
  const revokeIds = new Set();
  revokeIds.add(revId);
  const transaction = updateFunc.bind(dockAPI.revocation)(registryId, revokeIds, lastModified, didKeys);
  await dockAPI.sendTransaction(transaction);
}

/**
 * TODO: Use the spread operator to accept multiple revocation ids
 * Revoke a single credential
 * @param dockAPI
 * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
 * @param registryId - The registry id being updated
 * @param revId - The revocation id that is being revoked
 * @returns {Promise<void>}
 */
export async function revokeCredential(dockAPI, didKeys, registryId, revId) {
  return updateRevReg(dockAPI.revocation.revoke, dockAPI, didKeys, registryId, revId);
}

/**
 * TODO: Use the spread operator to accept multiple revocation ids
 * Unrevoke a single credential
 * @param dockAPI
 * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
 * @param registryId - The registry id being updated
 * @param revId - The revocation id that is being unrevoked
 * @returns {Promise<void>}
 */
export async function unrevokeCredential(dockAPI, didKeys, registryId, revId) {
  return updateRevReg(dockAPI.revocation.unrevoke, dockAPI, didKeys, registryId, revId);
}
