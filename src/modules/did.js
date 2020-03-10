const DockDIDQualifier = 'did:dock';

/** Class to create, update and destroy DIDs */
class DIDModule {
  /**
   * Creates a new instance of DIDModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
  }

  /**
   * Creates a new DID
   * @param {string} did - DID
   * @param {string} controller - DID Controller
   * @param {PublicKey} public_key - DID Creator Public Key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  new(did, controller, public_key) {
    return this.api.tx.didModule.new(did, {
      controller,
      public_key,
    });
  }

  /**
   * Updates a DID
   * @param {string} did - DID
   * @param {string} controller - DID Controller
   * @param {PublicKey} public_key - DID Creator Public Key
   * @param {string} signature - DID Creator signature
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  updateKey(did, controller, public_key, signature) {
    const keyUpdate = {
      did,
      controller,
      public_key,
      last_modified_in_block: 0,
    };

    return this.api.tx.didModule.updateKey(keyUpdate, signature);
  }

  /**
   * Removes a DID
   * @param {string} did - DID
   * @param {string} signature - DID Creator signature
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  remove(did, signature) {
    return this.api.tx.didModule.remove({
      did,
      last_modified_in_block: 0,
    }, signature);
  }

  /**
   * Gets a DID
   * @param {string} did - DID
   * @return {object} The DID.
   */
  async get(did) {
    // TODO: Convert DID and pk to base58
    const resp = await this.api.query.didModule.dIDs(did);
    if (resp) {
      const detail = resp[0];
      const lastModifiedBlockNo = resp[1];

      if (lastModifiedBlockNo) {
        // Create the fully qualified DID like "did:dock:..."
        const id = `${DockDIDQualifier}:${did}`;

        // Determine the type of the public key
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
        const publicKey = [{
          'id': `${id}#keys-1`,
          type,
          'controller': `${DockDIDQualifier}:${detail.controller}`,
          publicKeyBase58
        }];

        const authentication = publicKey.map(key => key.id);

        return {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id,
          publicKey,
          authentication
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
