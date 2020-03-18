import {isHexWithGivenByteSize} from '../utils';

const DockDIDQualifier = 'did:dock';
const signatureHeaders = {
  Sr25519VerificationKey2018: 'Sr25519SignatureAuthentication2018',
  Ed25519VerificationKey2018: 'Ed25519SignatureAuthentication2018',
  EcdsaSecp256k1VerificationKey2019: 'EcdsaSecp256k1SignatureAuthentication2019',
};

/**
 * Check if the given identifier is 32 byte hex
 * @param {identifier} identifier - The identifier to check.
 * @return {null} Throws exception if invalid identifier
 */
function validateDockDIDIdentifier(did) {
  // Byte size of the Dock DID identifier, i.e. the `DockDIDQualifier` is not counted.
  const DockDIDByteSize = 32;
  if (!isHexWithGivenByteSize(did, DockDIDByteSize)) {
    throw `DID identifier must be ${DockDIDByteSize} bytes`;
  }
}

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
   * @param {string} did - The new DID
   * @param {string} controller - The DID of the public key's controller
   * @param {PublicKey} publicKey - A public key associated with the DID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  new(did, controller, publicKey) {
    // Controller and did should be valid Dock DIDs
    validateDockDIDIdentifier(did);
    validateDockDIDIdentifier(controller);
    return this.module.new(did, {
      controller,
      public_key: publicKey.toJSON(),
    });
  }

  /**
   * Updates the details of an already registered DID on the Dock chain.
   * @param {string} did - DID
   * @param {Signature} signature - Signature from existing key
   * @param {PublicKey} publicKey -The new public key
   * @param {optional string} controller - The new key's controller
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  updateKey(did, signature, publicKey, controller) {
    validateDockDIDIdentifier(did);
    if (controller) {
      validateDockDIDIdentifier(controller);
    }
    const keyUpdate = {
      did,
      controller,
      public_key: publicKey.toJSON(),
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
    validateDockDIDIdentifier(did);
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
   * @return {object} The DID document.
   */
  async getDocument(did) {
    // TODO: Convert DID and pk to base58
    const detail = (await this.getDetail(did))[0];
    const id = this.getFullyQualifiedDID(did);

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
  }

  /**
   * Gets the key detail and block number in which the DID was last modified from
   * the chain and return them. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {string} did - DID
   * @return {array} A 2 element array with first
   */
  async getDetail(did) {
    const resp = await this.api.query.didModule.dids(did);

    if (!resp) {
      throw 'Got null response';
    }

    if (resp.isNone) {
      throw 'Could not find DID: ' + did;
    }

    const respTuple = resp.unwrap();
    if (respTuple.length != 2) {
      throw 'Needed 2 items in response but got' + respTuple.length;
    }

    return [respTuple[0], respTuple[1].toNumber()];
  }
}

export default DIDModule;
