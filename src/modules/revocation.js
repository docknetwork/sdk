import {
  getNonce,
  getSignatureFromKeyringPair,
  getStateChange,
} from '../utils/misc';

import { createDidSig, getHexIdentifierFromDID } from '../utils/did'; // eslint-disable-line

/** Class to create, update and destroy revocations */
class RevocationModule {
  /**
   * Creates a new instance of RevocationModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param signAndSend
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
      newRegistry: {
        policy: policy.toJSON(),
        addOnly,
      },
    };
    return this.module.newRegistry(addReg);
  }

  /**
   * Creating a revocation registry
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Policy} policy - The registry policy
   * @param {Boolean} addOnly - true: credentials can be revoked, but not un-revoked, false: credentials can be revoked and un-revoked
   * @param waitForFinalization
   * @param params
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
   * Create a transaction to remove a revocation registry
   * @return {Promise<object>} The extrinsic to sign and send.
   * @param removal - The payload to remove the registry
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   */
  createRemoveRegistryTx(removal, didSigs) {
    return this.module.removeRegistry(removal, didSigs);
  }

  /**
   * Remove a revocation registry
   * @return {Promise<object>} Promise to the pending transaction
   * @param removal
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   * @param waitForFinalization
   * @param params
   */
  async removeRegistry(removal, didSigs, waitForFinalization = true, params = {}) {
    return this.signAndSend(this.createRemoveRegistryTx(removal, didSigs), waitForFinalization, params);
  }

  /**
   * Create transaction to revoke credentials
   * @return {Promise<object>} The extrinsic to sign and send.
   * @param revoke
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   */
  createRevokeTx(revoke, didSigs) {
    return this.module.revoke(revoke, didSigs);
  }

  /**
   * Revoke credentials
   * @return {Promise<object>} Promise to the pending transaction
   * @param revoke
   * @param didSigs
   * @param waitForFinalization
   * @param params
   */
  async revoke(revoke, didSigs, waitForFinalization = true, params = {}) {
    return this.signAndSend(this.createRevokeTx(revoke, didSigs), waitForFinalization, params);
  }

  /**
   * Create transaction to unrevoke credentials
   * @return {Promise<object>} The extrinsic to sign and send.
   * @param unrevoke
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   */
  createUnrevokeTx(unrevoke, didSigs) {
    return this.module.unrevoke(unrevoke, didSigs);
  }

  /**
   * Unrevoke credentials
   * @return {Promise<object>} Promise to the pending transaction
   * @param unrevoke
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   * @param waitForFinalization
   * @param params
   */
  async unrevoke(unrevoke, didSigs, waitForFinalization = true, params = {}) {
    return this.signAndSend(this.createUnrevokeTx(unrevoke, didSigs), waitForFinalization, params);
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
   * Get revocation statuses of multiple ids. Note that this function sees changes a bit delayed after the actual write
   * so if this function is being called immediately after any concerned storage is written to, you should wait for block
   * finalization. See its usage in the test.
   * @param {Array[]} regRevPairs - An array of pairs where the first item is the registry id and the
   * second is the revocation id.
   * @param {String} regRevPairs[][0] - Registry id.
   * @param {String} regRevPairs[][1] - Revocation id.
   * @returns {Promise<*>}
   */
  async areRevoked(regRevPairs) {
    const resp = await this.api.query.revoke.revocations.multi(regRevPairs);
    return resp.map((r) => !r.isNone);
  }

  /**
   * TODO: Use the spread operator to accept multiple revocation ids
   * Revoke a single credential. Works only with registries having `OneOf` policy
   * @param registryId - The registry id being updated
   * @param revId - The revocation id that is being revoked
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param didModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<void>}
   */
  async revokeCredentialWithOneOfPolicy(registryId, revId, did, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const [revoke, sig, sigNonce] = await this.createSignedRevoke(registryId, [revId], did, keyPair, keyId, { nonce, didModule });
    return this.revoke(revoke, [[sig, sigNonce]], waitForFinalization, params);
  }

  /**
   * Unrevoke a single credential. Works only with registries having `OneOf` policy
   * @param registryId
   * @param revId
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param didModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<Object>}
   */
  async unrevokeCredentialWithOneOfPolicy(registryId, revId, did, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const [revoke, sig, sigNonce] = await this.createSignedUnRevoke(registryId, [revId], did, keyPair, keyId, { nonce, didModule });
    return this.unrevoke(revoke, [[sig, sigNonce]], waitForFinalization, params);
  }

  async removeRegistryWithOneOfPolicy(registryId, did, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    const [removal, sig, sigNonce] = await this.createSignedRemove(registryId, did, keyPair, keyId, { nonce, didModule });
    return this.removeRegistry(removal, [[sig, sigNonce]], waitForFinalization, params);
  }

  async createSignedUpdate(updateFunc, registryId, [...revokeIds], did, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const hexDid = getHexIdentifierFromDID(did);
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);

    const update = {
      data: {
        registryId,
        revokeIds,
      },
      nonce,
    };
    const serializedRevoke = updateFunc.bind(this)(update);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRevoke);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [{ registryId, revokeIds }, didSig, nonce];
  }

  async createSignedRevoke(registryId, revokeIds, did, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    return this.createSignedUpdate(this.getSerializedRevoke, registryId, revokeIds, did, keyPair, keyId, { nonce, didModule });
  }

  async createSignedUnRevoke(registryId, revokeIds, did, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    return this.createSignedUpdate(this.getSerializedUnrevoke, registryId, revokeIds, did, keyPair, keyId, { nonce, didModule });
  }

  async createSignedRemove(registryId, did, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const hexDid = getHexIdentifierFromDID(did);
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);

    const remove = {
      data: { registryId },
      nonce,
    };
    const serializedRemove = this.getSerializedRemoveRegistry(remove);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemove);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [{ registryId }, didSig, nonce];
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
