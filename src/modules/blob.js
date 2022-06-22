import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import { u8aToString, stringToHex, bufferToU8a } from '@polkadot/util';

import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { isHexWithGivenByteSize, getHexIdentifier } from '../utils/codec';
import NoBlobError from '../utils/errors/no-blob-error';
import Signature from '../signatures/signature'; // eslint-disable-line

export const DockBlobQualifier = 'blob:dock:';
export const DockBlobIdByteSize = 32;

// Maximum size of the blob in bytes
// implementer may choose to implement this as a dynamic config option settable with the `parameter_type!` macro
export const BLOB_MAX_BYTE_SIZE = 8192;

/**
 * Check if the given identifier is 32 byte hex
 * @param {string} identifier - The identifier to check.
 * @return {void} Throws exception if invalid identifier
 */
export function validateBlobIDHexIdentifier(identifier) {
  if (!isHexWithGivenByteSize(identifier, DockBlobIdByteSize)) {
    throw new Error(`ID must be ${DockBlobIdByteSize} bytes`);
  }
}

/**
 * Gets the hexadecimal value of the given ID.
 * @param {string} id -  The ID can be passed as fully qualified ID like `blob:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the ID.
 */
export function getHexIdentifierFromBlobID(id) {
  return getHexIdentifier(id, DockBlobQualifier, validateBlobIDHexIdentifier, DockBlobIdByteSize);
}

/**
 * Create and return a fully qualified Dock Blob id, i.e. "blob:dock:<SS58 string>"
 * @returns {string} - The Blob id
 */
export function createNewDockBlobId() {
  const hexId = randomAsHex(DockBlobIdByteSize);
  return blobHexIdToQualified(hexId);
}

/**
 * Return a fully qualified Dock Blob id, i.e. "blob:dock:<SS58 string>"
 * @param {string} hexId - The hex blob id (without the qualifier)
 * @returns {string} - The fully qualified Blob id
 */
export function blobHexIdToQualified(hexId) {
  const ss58Id = encodeAddress(hexId);
  return `${DockBlobQualifier}${ss58Id}`;
}

/** Class to create and update Blobs on chain. */
class BlobModule {
  /**
   * Creates a new instance of BlobModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.blobStore;
    this.signAndSend = signAndSend;
  }

  /**
   * Create a transaction to register a new Blob on the Dock Chain
   * @param {object} blob - struct to store on chain
   * @param {object} keyPair - Key pair to sign with
   * @param {Signature} signature - Signature to use
   * @return {object} The extrinsic to sign and send.
   */
  createNewTx(blob, keyPair = undefined, signature = undefined) {
    let value = blob.blob;
    if (!value) {
      throw new Error('Blob must have a value!');
    }

    if (value instanceof Uint8Array) {
      value = [...value];
    } else if (typeof value === 'object') {
      value = stringToHex(JSON.stringify(value));
    } else if (typeof value === 'string' && !isHexWithGivenByteSize(value)) {
      value = stringToHex(value);
    }

    const blobObj = {
      ...blob,
      blob: value,
    };

    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to register a new Blob.');
      }
      const serializedBlob = this.getSerializedBlob(blobObj);
      // eslint-disable-next-line no-param-reassign
      signature = getSignatureFromKeyringPair(keyPair, serializedBlob);
    }
    return this.module.new(blobObj, signature.toJSON());
  }

  /**
   * Register a new Blob on the Dock Chain
   * @param {object} blob - struct to store on chain
   * @param {object} keyPair - Key pair to sign with
   * @param {Signature} signature - Signature to use
   * @return {Promise<object>} Promise to the pending transaction
   */
  async new(blob, keyPair = undefined, signature = undefined, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createNewTx(blob, keyPair, signature), waitForFinalization, params);
  }

  /**
   *  Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Array>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async get(id) {
    const hexId = getHexIdentifierFromBlobID(id);
    const resp = await this.api.query.blobStore.blobs(hexId);
    if (resp.isNone) {
      throw new NoBlobError(id);
    }

    const respTuple = resp.unwrap();
    if (respTuple.length === 2) {
      let value = bufferToU8a(respTuple[1]);

      // Try to convert the value to a JSON object
      try {
        const strValue = u8aToString(value);
        if (strValue.substr(0, 1) === '{') {
          value = JSON.parse(strValue);
        }
      } catch (e) {
        // no-op, just use default Uint8 array value
      }

      return [respTuple[0], value];
    }
    throw new Error(`Needed 2 items in response but got${respTuple.length}`);
  }

  /**
   * Serializes the `Blob` (for signing before sending to the node)
   * @param {object} blob - `Blob` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedBlob(blob) {
    return getStateChange(this.api, 'Blob', blob);
  }
}

export default BlobModule;
