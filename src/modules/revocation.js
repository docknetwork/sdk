/** Class to create, update and destroy revocations */
class RevocationModule {
  /**
   * Creates a new instance of RevocationModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
  }

  /**
   * Creating a revocation registry
   * @param {string} origin - The origin
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {RevRegistry} registry - Will serialized `registry` and update the map `rev_registries` with `id` -> `(registry, last updated block number)
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  new(origin, id, registry) {
    return this.api.tx.revocationModule.new(origin, id, registry);
  }

  /**
   * Revoke credentials
   * @param {string} origin - The origin
   * @param {Revoke} toRevoke - contains the credentials to be revoked
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing these revocations. Each tuple contains the controller and its signature.
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  revoke(origin, toRevoke, controllers) {
    return this.api.tx.revocationModule.revoke(origin, toRevoke, controllers);
  }

  /**
   * Unrevoke credentials
   * @param {string} origin - The origin
   * @param {Unrevoke} toUnrevoke - contains the credentials to be revoked
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing these unrevocations. Each tuple contains the controller and its signature.
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  unrevoke(origin, toUnrevoke, controllers) {
    return this.api.tx.revocationModule.unrevoke(origin, toUnrevoke, controllers);
  }

  /**
   * Deleting revocation registry
   * @param {string} origin - The origin
   * @param {RemoveRegistry} toRemove - contains the registry to remove
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing this removal. Each tuple contains the controller and its signature
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  remove(origin, toRemove, controllers) {
    return this.api.tx.revocationModule.remove(origin, toRemove, controllers);
  }

  /**
   * The read-only call get_revocation_registry is used to get details of the revocation registry like controllers, policy and type. If the registry is not present, None is returned.
   * @param {string} revRegID - Revocation registry ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  getRevocationRegistry(revRegID) {
    return this.api.tx.revocationModule.getRevocationRegistry(revRegID);
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {string} revRegID - Revocation registry ID
   * @param {string} credentialID - Credential ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  getRevocationStatus(revRegID, credentialID) {
    return this.api.tx.revocationModule.getRevocationStatus(revRegID, credentialID);
  }
}

export default RevocationModule;
