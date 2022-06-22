import { BTreeSet } from '@polkadot/types';
import { getStateChange } from '../utils/misc';

import DidKeys from "../utils/revocation/did-keys"; // eslint-disable-line
import Policy from "../utils/revocation/policy"; // eslint-disable-line

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
    return this.module.newRegistry(
      id,
      {
        policy: policy.toJSON(),
        addOnly,
      },
    );
  }

  /**
   * Creating a revocation registry
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Policy} policy - The registry policy
   * @param {Boolean} addOnly - true: credentials can be revoked, but not un-revoked, false: credentials can be revoked and un-revoked
   * @return {Promise<object>} Promise to the pending transaction
   */
  async newRegistry(
    id,
    policy,
    addOnly,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.createNewRegistryTx(id, policy, addOnly),
      waitForFinalization,
      params,
    );
  }

  /**
   * Deleting revocation registry
   * @param {string} registryID - contains the registry to remove
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRemoveRegistryTx(registryID, lastModified, didKeys) {
    const removal = {
      registryId: registryID,
      lastModified,
    };

    const serializedRemoval = this.getSerializedRemoveRegistry(removal);
    const signedProof = didKeys.getSignatures(serializedRemoval);
    return this.module.removeRegistry(removal, signedProof);
  }

  /**
   * Deleting revocation registry
   * @param {string} registryID - contains the registry to remove
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async removeRegistry(
    registryID,
    lastModified,
    didKeys,
    waitForFinalization = true,
    params = {},
  ) {
    return await this.signAndSend(
      this.createRemoveRegistryTx(registryID, lastModified, didKeys),
      waitForFinalization,
      params,
    );
  }

  /**
   * Revoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRevokeTx(registryID, revokeIds, lastModified, didKeys) {
    const revoke = {
      registryId: registryID,
      revokeIds: [...revokeIds],
      lastModified,
    };

    const serializedRevoke = this.getSerializedRevoke(revoke);
    const signedProof = didKeys.getSignatures(serializedRevoke);
    return this.module.revoke(
      revoke,
      signedProof,
    );
  }

  /**
   * Revoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async revoke(
    registryID,
    revokeIds,
    lastModified,
    didKeys,
    waitForFinalization = true,
    params = {},
  ) {
    return await this.signAndSend(
      this.createRevokeTx(registryID, revokeIds, lastModified, didKeys),
      waitForFinalization,
      params,
    );
  }

  /**
   * Unrevoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createUnrevokeTx(registryID, revokeIds, lastModified, didKeys) {
    const unrevoke = {
      registryId: registryID,
      revokeIds: [...revokeIds],
      lastModified,
    };

    const serializedUnrevoke = this.getSerializedUnrevoke(unrevoke);
    const signedProof = didKeys.getSignatures(serializedUnrevoke);
    return this.module.unrevoke(
      unrevoke,
      signedProof,
    );
  }

  /**
   * Unrevoke credentials
   * @param {string} registryID - contains the registry to remove
   * @param {Set} revokeIds - revoke id list
   * @param {number} lastModified - contains the registry to remove
   * @param {DidKeys} didKeys - The did key set used for generating proof
   * @return {Promise<object>} Promise to the pending transaction
   */
  async unrevoke(
    registryID,
    revokeIds,
    lastModified,
    didKeys,
    waitForFinalization = true,
    params = {},
  ) {
    return await this.signAndSend(
      this.createUnrevokeTx(registryID, revokeIds, lastModified, didKeys),
      waitForFinalization,
      params,
    );
  }

  /**
   * The read-only call get_revocation_registry is used to get data of the revocation registry like controllers, policy and type.
   * If the registry is not present, None is returned.
   * @param {string} registryID - Revocation registry ID
   * @return {Promise} A promise to registry data
   */
  async getRevocationRegistry(registryID) {
    const detail = await this.getRegistryDetail(registryID);
    return detail[0];
  }

  /**
   * Get detail of the registry. Its a 2 element array where the first element is the registry's policy and addOnly
   * status and second is the block number where the registry was last modified.
   * @param registryID
   * @returns {Promise<array>}
   */
  async getRegistryDetail(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp.isNone) {
      throw new Error(`Could not find revocation registry: ${registryID}`);
    }

    const respTuple = resp.unwrap();
    if (respTuple.length === 2) {
      return [respTuple[0], respTuple[1].toNumber()];
    }
    throw new Error(`Needed 2 items in response but got${respTuple.length}`);
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
   * Internal helper to avoid code duplication while updating the revocation registry by revoking or unrevoking a credential.
   * @param {function} updateFunc - A function that's called in the context of `dockAPI.revocation` to send an extrinsic. Is either
   * `dockAPI.revocation.revoke` or `dockAPI.revocation.unrevoke`
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param {string} registryId - The registry id being updated
   * @param {string} revId - The revocation id being revoked or unrevoked
   * @returns {Promise<void>}
   */
  async updateRevReg(
    updateFunc,
    didKeys,
    registryId,
    revId,
    waitForFinalization = true,
    params = {},
  ) {
    const lastModified = await this.getBlockNoForLastChangeToRegistry(
      registryId,
    );
    const revokeIds = new BTreeSet();
    revokeIds.add(revId);

    return updateFunc.bind(this)(
      registryId,
      revokeIds,
      lastModified,
      didKeys,
      waitForFinalization,
      params,
    );
  }

  /**
   * TODO: Use the spread operator to accept multiple revocation ids
   * Revoke a single credential
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param registryId - The registry id being updated
   * @param revId - The revocation id that is being revoked
   * @returns {Promise<void>}
   */
  async revokeCredential(
    didKeys,
    registryId,
    revId,
    waitForFinalization = true,
    params = {},
  ) {
    return this.updateRevReg(
      this.revoke,
      didKeys,
      registryId,
      revId,
      waitForFinalization,
      params,
    );
  }

  /**
   * TODO: Use the spread operator to accept multiple revocation ids
   * Unrevoke a single credential
   * @param {DidKeys} didKeys - The map of DID and keypair to sign the update
   * @param registryId - The registry id being updated
   * @param revId - The revocation id that is being unrevoked
   * @returns {Promise<void>}
   */
  async unrevokeCredential(
    didKeys,
    registryId,
    revId,
    waitForFinalization = true,
    params = {},
  ) {
    return this.updateRevReg(
      this.unrevoke,
      didKeys,
      registryId,
      revId,
      waitForFinalization,
      params,
    );
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
