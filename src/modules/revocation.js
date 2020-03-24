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
   * @param {Registry} registry - Will serialized `registry` and update the map `rev_registries` with `id` -> `(registry, last updated block number)
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  newRegistry(id, registry) {
    console.log('new revocation', id, registry.toJSON())
    return this.module.newRegistry(id, registry);
  }

  /**
   * Deleting revocation registry
   * @param {RemoveRegistry} removal - contains the registry to remove
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  removeRegistry(removal, proof) {
    return this.module.removeRegistry(origin, toRemove, controllers);
  }

  /**
   * Revoke credentials
   * @param {Revoke} revoke - contains the credentials to be revoked
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  revoke(revoke, proof) {
    return this.module.revoke(revoke, proof);
  }

  /**
   * Unrevoke credentials
   * @param {UnRevoke} unrevoke - contains the credentials to be revoked
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  unrevoke(unrevoke, proof) {
    return this.module.unrevoke(unrevoke, proof);
  }

  /**
   * The read-only call get_revocation_registry is used to get details of the revocation registry like controllers, policy and type. If the registry is not present, None is returned.
   * @param {RegistryId} registryID - Revocation registry ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async getRevocationRegistry(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp && !resp.isNone) {
      return resp;
    }
    throw new Error('Could not find revocation registry: ' + registryID);
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {RegistryId} registryID - Revocation registry ID
   * @param {RevokeId} revokeId - Credential ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async getRevocationStatus(registryID, revokeID) {
    const resp = await this.api.query.revoke.revocations(registryID, revokeID);
    if (resp && !resp.isNone) {
      return resp;
    }
    throw new Error('Could not find revocation status: ' + registryID + ' for ' + revokeID);
  }
}

export default RevocationModule;
