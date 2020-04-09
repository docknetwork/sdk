import {
  getStateChange,
} from '../utils/misc';

/** Class to create, update and destroy revocations */
class RevocationModule {
  /**
   * Creates a new instance of RevocationModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
    this.module = api.tx.revoke;
  }

  /**
   * Creating a revocation registry
   * @param {RegistryId} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Policy} policy - The registry policy
   * @param {bool} addOnly - true: credentials can be revoked, but not un-revoked, false: credentials can be revoked and un-revoked
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  newRegistry(id, policy, addOnly) {
    return this.module.newRegistry(id, {
      policy: policy.toJSON(),
      add_only: addOnly,
    });
  }

  /**
   * Deleting revocation registry
   * @param {RegistryId} registryID - contains the registry to remove
   * @param {BlockNumber} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  removeRegistry(registryID, lastModified, didKeys) {
    const removal = {
      registry_id: registryID,
      last_modified: lastModified
    };

    const serializedRemoval = this.getSerializedRemoveRegistry(removal);
    const signedProof = didKeys.getSignatures(serializedRemoval);
    return this.module.removeRegistry(removal, signedProof);
  }

  /**
   * Revoke credentials
   * @param {RegistryId} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {BlockNumber} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  revoke(registryID, revokeIds, lastModified, didKeys) {
    const revoke = {
      registry_id: registryID,
      revoke_ids: revokeIds,
      last_modified: lastModified
    };

    const serializedRevoke = this.getSerializedRevoke(revoke);
    const signedProof = didKeys.getSignatures(serializedRevoke);
    return this.module.revoke(revoke, signedProof);
  }

  /**
   * Unrevoke credentials
   * @param {RegistryId} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {BlockNumber} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  unrevoke(registryID, revokeIds, lastModified, didKeys) {
    const unrevoke = {
      registry_id: registryID,
      revoke_ids: revokeIds,
      last_modified: lastModified
    };

    const serializedUnrevoke = this.getSerializedUnrevoke(unrevoke);
    const signedProof = didKeys.getSignatures(serializedUnrevoke);
    return this.module.unrevoke(unrevoke, signedProof);
  }

  /**
   * The read-only call get_revocation_registry is used to get data of the revocation registry like controllers, policy and type.
   * If the registry is not present, None is returned.
   * @param {RegistryId} registryID - Revocation registry ID
   * @return {Promise} A promise to registry data
   */
  async getRevocationRegistry(registryID) {
    const detail = await this.getRegistryDetail(registryID);
    return detail[0];
  }

  /**
   * Get detail of the registry. Its a 2 element array where the first element is the registry's policy and add_only
   * status and second is the block number where the registry was last modified.
   * @param registryID
   * @returns {Promise<(*|number)[]>}
   */
  async getRegistryDetail(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp.isNone) {
      throw new Error('Could not find revocation registry: ' + registryID);
    }

    const respTuple = resp.unwrap();
    if (respTuple.length === 2) {
      return [
        respTuple[0],
        respTuple[1].toNumber()
      ];
    } else {
      throw new Error('Needed 2 items in response but got' + respTuple.length);
    }
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {RegistryId} registryId - Revocation registry ID
   * @param {RevokeId} revokeId - Revocation id. This is set as the hash of the credential id.
   * @return {Promise<Boolean>} Returns a promise to true if credential is revoked else to false.
   */
  async getIsRevoked(registryId, revokeId) {
    const resp = await this.api.query.revoke.revocations(registryId, revokeId);
    return !resp.isNone;
  }

  /**
   * Gets the block number in which the registry was last modified in the chain
   * and return it. Throws error if the registry with given id does not exist on
   * chain or chain returns null response.
   * @param registryId
   * @returns {Promise<*|number>}
   */
  async getBlockNoForLastChangeToRegistry(registryId) {
    return (await this.getRegistryDetail(registryId))[1];
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
    return getStateChange(this.api, 'Unrevoke', unrevoke);
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
