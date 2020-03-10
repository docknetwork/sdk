// TODO: document this file properly

const DockDIDQualifier = 'did:dock';

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

  /**
   * Gets a DID
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

        const authentication = publicKey.map(key => {
          return key.id;
        });

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
