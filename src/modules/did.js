import {encodeAddress} from '@polkadot/util-crypto';
import b58 from 'bs58';

import {getHexIdentifierFromDID, DockDIDQualifier} from '../utils/did';
import {getStateChange} from '../utils/misc';

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
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {object} keyDetail - `KeyDetail` as expected by the Substrate node
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  new(did, keyDetail) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.new(hexId, keyDetail);
  }

  /**
   * Updates the details of an already registered DID on the Dock chain.
   * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
   * @param {DidSignature} signature - Signature from existing key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  updateKey(keyUpdate, signature) {
    return this.module.updateKey(keyUpdate, signature.toJSON());
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @param {DidSignature} signature - Signature from existing key
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  remove(didRemoval, signature) {
    return this.module.remove(didRemoval, signature.toJSON());
  }

  /**
   * Create the fully qualified DID like "did:dock:..."
   * @param {string} did - DID
   * @return {string} The DID identifer.
   */
  getFullyQualifiedDID(did) {
    return `${DockDIDQualifier}${did}`;
  }

  /**
   * Gets a DID from the Dock chain and create a DID document according to W3C spec.
   * @param {string} did - The DID can be passed as fully qualified DID like `dock:did:<SS58 string>` or
   * a 32 byte hex string
   * @return {object} The DID document.
   */
  async getDocument(did) {
    const hexId = getHexIdentifierFromDID(did);
    const detail = (await this.getDetail(hexId))[0];
    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id = (did === hexId) ? this.getFullyQualifiedDID(encodeAddress(hexId)) : did;

    // Determine the type of the public key
    let type, publicKeyRaw;
    if (detail.public_key.isSr25519) {
      type = 'Sr25519VerificationKey2018';
      publicKeyRaw = detail.public_key.asSr25519;
    } else if (detail.public_key.isEd25519) {
      type = 'Ed25519VerificationKey2018';
      publicKeyRaw = detail.public_key.asEd25519;
    } else {
      type = 'EcdsaSecp256k1VerificationKey2019';
      publicKeyRaw = detail.public_key.asSecp256K1;
    }

    // The DID has only one key as of now.
    const publicKey = {
      id: `${id}#keys-1`,
      type,
      controller: this.getFullyQualifiedDID(encodeAddress(detail.controller)),
      publicKeyBase58: b58.encode(publicKeyRaw.value),
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
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {array} A 2 element array with first
   */
  async getDetail(didIdentifier) {
    const resp = await this.api.query.didModule.dids(didIdentifier);
    if (resp) {
      if (resp.isNone) {
        throw new Error('Could not find DID: ' + didIdentifier);
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
   * Gets the block number in which the DID was last modified from
   * the chain and return it. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {array} A 2 element array with first
   */
  async getBlockNoForLastChangeToDID(didIdentifier) {
    return (await this.getDetail(didIdentifier))[1];
  }

  /**
   * Serializes a `KeyUpdate` for signing.
   * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedKeyUpdate(keyUpdate) {
    return getStateChange(this.api, 'KeyUpdate', keyUpdate);
  }

  /**
   * Serializes a `DidRemoval` for signing.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedDIDRemoval(didRemoval) {
    return getStateChange(this.api, 'DidRemoval', didRemoval);
  }
}

export default DIDModule;
