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
}

export default RevocationModule;
