import {getBytesForStateChange} from '../utils/misc';

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
    return this.module.newRegistry(id, registry.toJSON());
  }

  /**
   * Deleting revocation registry
   * @param {RemoveRegistry} removal - contains the registry to remove
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  removeRegistry(removal, proof) {
    return this.module.removeRegistry(removal, proof);
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
    const detail = await this.getRegistryDetail(registryID);
    return detail[0];
  }

  async getRegistryDetail(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp) {
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
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {RegistryId} registryID - Revocation registry ID
   * @param {RevokeId} revokeId - Credential ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async getRevocationStatus(registryID, revokeID) {
    const resp = await this.api.query.revoke.revocations(registryID, revokeID);
    if (resp) {
      return !resp.isNone;
    }
  }

  getSerializedRevoke(revoke) {
    // TODO: not happy with each module having methods to do this
    // can do a utility like getStateChange(api, 'Revoke', change)
    // internally construct stateChange object like below
    const stateChange = {
      Revoke: revoke
    };

    return getBytesForStateChange(this.api, stateChange);
  }

  serializedUnrevoke(revoke) {
    const stateChange = {
      Unrevoke: revoke
    };

    return getBytesForStateChange(this.api, stateChange);
  }

  getSerializedRemoveRegistry(removeReg) {
    const stateChange = {
      RemoveRegistry: removeReg
    };

    return getBytesForStateChange(this.api, stateChange);
  }
}

export default RevocationModule;
