// TODO: document this file properly
class DIDModule {
  constructor(api) {
    this.api = api;
  }

  /**
   * Creates a new DID
   * @return {string} The extrinsic to sign and send.
   */
  new(did, controller, publicKey) {
    return this.api.tx.didModule.new(did, {
      controller,
      public_key: publicKey
    });
  }
}

export default DIDModule;
