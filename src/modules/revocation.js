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
   * Revoke credentials
   * @param {string} origin - The origin
   * @param {Revoke} to_revoke - contains the credentials to be revoked
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing these revocations. Each tuple contains the controller and its signature.
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  revoke(origin, to_revoke, controllers) {

  }

  /**
   * Unrevoke credentials
   * @param {string} origin - The origin
   * @param {Unrevoke} to_unrevoke - contains the credentials to be revoked
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing these unrevocations. Each tuple contains the controller and its signature.
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  unrevoke(origin, to_unrevoke, controllers) {

  }

  /**
   * Deleting revocation registry
   * @param {string} origin - The origin
   * @param {RemoveRegistry} to_remove - contains the registry to remove
   * @param {Array} controllers - contains the `(DID, signature)`s of the controllers who are allowing this removal. Each tuple contains the controller and its signature
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  remove(origin, to_remove, controllers) {

  }

  /**
   * The read-only call get_revocation_registry is used to get details of the revocation registry like controllers, policy and type. If the registry is not present, None is returned.
   * @param {string} rev_reg_id - Revocation registry ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  getRevocationRegistry(rev_reg_id) {

  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {string} rev_reg_id - Revocation registry ID
   * @param {string} cred_id - Credential ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  getRevocationStatus(rev_reg_id, cred_id) {

  }
}

export default RevocationModule;
