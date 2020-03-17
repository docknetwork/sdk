const DockDIDQualifier = 'did:dock';

const signatureHeaders = {
  Sr25519VerificationKey2018: 'Sr25519SignatureAuthentication2018',
  Ed25519VerificationKey2018: 'Ed25519SignatureAuthentication2018',
  EcdsaSecp256k1VerificationKey2019: 'EcdsaSecp256k1SignatureAuthentication2019',
};

/** Class to create, update and destroy DIDs */
class DIDModule {
  /**
   * Creates a new instance of DIDModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
    this.module = api.tx.didModule;
  }

  /**
   * Creates a new DID on the Dock chain.
   * @param {string} did - DID
   * @param {string} controller - DID Controller
   * @param {PublicKey} public_key - DID Creator Public Key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  new(did, controller, public_key) {
    return this.module.new(did, {
      controller,
      public_key,
    });
  }

  /**
   * Updates the details of an already registered DID on the Dock chain.
   * @param {string} did - DID
   * @param {string} controller - The new key's controller
   * @param {PublicKey} public_key -The new public key
   * @param {Signature} signature - Signature from existing key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  updateKey(did, controller, public_key, signature) {
    const keyUpdate = {
      did,
      controller,
      public_key,
      last_modified_in_block: 0,
    };

    return this.module.updateKey(keyUpdate, signature);
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {string} did - DID
   * @param {Signature} signature - Signature from existing key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  remove(did, signature) {
    return this.module.remove({
      did,
      last_modified_in_block: 0,
    }, signature);
  }

  /**
   * Create the fully qualified DID like "did:dock:..."
   * @param {string} did - DID
   * @return {string} The DID identifer.
   */
  getFullyQualifiedDID(did) {
    return `${DockDIDQualifier}:${did}`;
  }

  /**
   * Gets a DID from the Dock chain and create a DID document according to W3C spec.
   * @param {string} did - DID
   * @return {object} The DID.
   */
  async getDocument(did) {
    // TODO: Convert DID and pk to base58
    const resp = await this.api.query.didModule.dids(did);
    if (resp) {
      if (resp.isSome) {
        const detail = resp.unwrap()[0];
        const id = this.getFullyQualifiedDID(did);

        // Determine the type of the public key
        // TODO: move to publickey getType method once abstraction exists
        let type, publicKeyBase58;
        if (detail.public_key.isSr25519) {
          type = 'Sr25519VerificationKey2018';
          publicKeyBase58 = detail.public_key.asSr25519;
        } else if (detail.public_key.isEd25519) {
          type = 'Ed25519VerificationKey2018';
          publicKeyBase58 = detail.public_key.asEd25519;
        } else {
          type = 'EcdsaSecp256k1VerificationKey2019';
          publicKeyBase58 = detail.public_key.asSecp256K1;
        }

        // The DID has only one key as of now.
        const publicKey = {
          id: `${id}#keys-1`,
          type,
          controller: `${DockDIDQualifier}:${detail.controller}`,
          publicKeyBase58,
          // publicKeyPem: '-----BEGIN PUBLIC KEY...END PUBLIC KEY-----\r\n', // TODO: add proper value
        };

        // Set keys and authentication reference
        const publicKeys = [publicKey];
        const authentication = publicKeys.map(key => {
          return {
            type: signatureHeaders[key.type],
            publicKey: [key.id]
          };
        });

        // TODO: setup proper service when we have it
        // const service = [{
        //   id: `${id}#vcs`,
        //   type: 'VerifiableCredentialService',
        //   serviceEndpoint: 'https://dock.io/vc/'
        // }];

        return {
          '@context': 'https://www.w3.org/ns/did/v1',
          id,
          authentication,
          publicKey: publicKeys
          // service,
        };
      } else {
        throw 'Could not find DID: ' + did;
      }
    } else {
      throw 'Got null response';
    }
  }
}

export default DIDModule;
