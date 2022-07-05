import {
  getSignatureFromKeyringPair,
  getStateChange,
} from '../utils/misc';

import DidKeys from '../utils/revocation/did-keys'; // eslint-disable-line
import Policy from '../utils/revocation/policy';
import { createDidSig, getHexIdentifierFromDID } from '../utils/did'; // eslint-disable-line

/** Class to create, update and destroy revocations */
class RevocationModule {
  /**
   * Creates a new instance of RevocationModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.revoke;
    this.signAndSend = signAndSend;
  }

  /**
   * Creating a revocation registry
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Policy} policy - The registry policy
   * @param {Boolean} addOnly - true: credentials can be revoked, but not un-revoked, false: credentials can be revoked and un-revoked
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createNewRegistryTx(id, policy, addOnly) {
    const addReg = {
      id,
      registry: {
        policy: policy.toJSON(),
        add_only: addOnly,
      },
    };
    return this.module.newRegistry(addReg);
  }

  /**
   * Creating a revocation registry
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Policy} policy - The registry policy
   * @param {Boolean} addOnly - true: credentials can be revoked, but not un-revoked, false: credentials can be revoked and un-revoked
   * @return {Promise<object>} Promise to the pending transaction
   */
  async newRegistry(id, policy, addOnly, waitForFinalization = true, params = {}) {
    return this.signAndSend(this.createNewRegistryTx(id, policy, addOnly), waitForFinalization, params);
  }

  /**
   * Deleting revocation registry
   * @param {string} registryID - contains the registry to remove
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRemoveRegistryTx(removal, didSigs) {
    return this.module.removeRegistry(removal, didSigs);
  }

  /**
   * Deleting revocation registry
   * @param {string} registryID - contains the registry to remove
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async removeRegistry(removal, didSigs, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRemoveRegistryTx(removal, didSigs), waitForFinalization, params);
  }

  /**
   * Revoke credentials
   * @param {string} registryId - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRevokeTx(revoke, didSigs) {
    return this.module.revoke(revoke, didSigs);
  }

  /**
   * Revoke credentials
   * @param {string} registryId - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async revoke(revoke, didSigs, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRevokeTx(revoke, didSigs), waitForFinalization, params);
  }

  /**
   * Unrevoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createUnrevokeTx(unrevoke, didSigs) {
    return this.module.unrevoke(unrevoke, didSigs);
  }

  /**
   * Unrevoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async unrevoke(unrevoke, didSigs, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createUnrevokeTx(unrevoke, didSigs), waitForFinalization, params);
  }

  /**
   * Get data of the revocation registry like controllers, policy and type.
   * If the registry is not present, error is thrown.
   * @param {string} registryID - Revocation registry ID
   * @return {Promise} A promise to registry data
   */
  async getRevocationRegistry(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp.isNone) {
      throw new Error(`Could not find revocation registry: ${registryID}`);
    }

    return resp.unwrap();
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {string} registryId - Revocation registry ID
   * @param {string} revokeId - Revocation id. This is set as the hash of the credential id.
   * @return {Promise<Boolean>} Returns a promise to true if credential is revoked else to false.
   */
  async getIsRevoked(registryId, revokeId) {
    const resp = await this.api.query.revoke.revocations(registryId, revokeId);
    return !resp.isNone;
  }

  /**
   * Internal helper to avoid code duplication while updating the revocation registry by revoking or unrevoking a credential.
   * @param {function} updateFunc - A function that's called in the context of `dockAPI.revocation` to send an extrinsic. Is either
   * `dockAPI.revocation.revoke` or `dockAPI.revocation.unrevoke`
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param {string} registryId - The registry id being updated
   * @param {string} revId - The revocation id being revoked or unrevoked
   * @returns {Promise<void>}
   */
  async updateRevReg(updateFunc, didKeys, registryId, revId, waitForFinalization = true, params = {}) {
    const lastModified = await this.getBlockNoForLastChangeToRegistry(registryId);
    const revokeIds = new Set();
    revokeIds.add(revId);
    return updateFunc.bind(this)(registryId, revokeIds, lastModified, didKeys, waitForFinalization, params);
  }

  /**
   * TODO: Use the spread operator to accept multiple revocation ids
   * Revoke a single credential
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param registryId - The registry id being updated
   * @param revId - The revocation id that is being revoked
   * @returns {Promise<void>}
   */
  async revokeCredential(didKeys, registryId, revId, waitForFinalization = true, params = {}) {
    return this.updateRevReg(this.revoke, didKeys, registryId, revId, waitForFinalization, params);
  }

  /**
   * TODO: Use the spread operator to accept multiple revocation ids
   * Unrevoke a single credential
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param registryId - The registry id being updated
   * @param revId - The revocation id that is being unrevoked
   * @returns {Promise<void>}
   */
  async unrevokeCredential(didKeys, registryId, revId, waitForFinalization = true, params = {}) {
    return this.updateRevReg(this.unrevoke, didKeys, registryId, revId, waitForFinalization, params);
  }

  async createSignedRevoke(didModule, registryId, revokeIds, did, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    if (nonce === undefined) {
      nonce = await didModule.getNextNonceForDID(hexDid);
    }

    const revoke = {
      registry_id: registryId,
      revoke_ids: revokeIds,
      nonce,
    };
    const serializedRevoke = this.getSerializedRevoke(revoke);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRevoke);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [{ registry_id: registryId, revoke_ids: revokeIds }, didSig, nonce];
  }

  async createSignedUnRevoke(didModule, registryId, revokeIds, did, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    if (nonce === undefined) {
      nonce = await didModule.getNextNonceForDID(hexDid);
    }

    const unRevoke = {
      registry_id: registryId,
      revoke_ids: revokeIds,
      nonce,
    };
    const serializedUnRevoke = this.getSerializedUnrevoke(unRevoke);
    const signature = getSignatureFromKeyringPair(keyPair, serializedUnRevoke);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [{ registry_id: registryId, revoke_ids: revokeIds }, didSig, nonce];
  }

  async createSignedRemove(didModule, registryId, did, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    if (nonce === undefined) {
      nonce = await didModule.getNextNonceForDID(hexDid);
    }

    const remove = {
      registry_id: registryId,
      nonce,
    };
    const serializedRemove = this.getSerializedRemoveRegistry(remove);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemove);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [{ registry_id: registryId }, didSig, nonce];
  }

  /**
   * Serializes a `Revoke` for signing.
   * @param {object} revoke - `Revoke` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedRevoke(revoke) {
    return getStateChange(this.api, 'Revoke', revoke);
  }

  /**
   * Serializes a `Unrevoke` for signing.
   * @param {object} unrevoke - `Unrevoke` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedUnrevoke(unrevoke) {
    return getStateChange(this.api, 'UnRevoke', unrevoke);
  }

  /**
   * Serializes a `RemoveRegistry` for signing.
   * @param {object} removeReg - `RemoveRegistry` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedRemoveRegistry(removeReg) {
    return getStateChange(this.api, 'RemoveRegistry', removeReg);
  }
}

export default RevocationModule;
