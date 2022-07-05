import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import { u8aToString, stringToHex, bufferToU8a } from '@polkadot/util';

import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { isHexWithGivenByteSize, getHexIdentifier } from '../utils/codec';
import NoBlobError from '../utils/errors/no-blob-error';
import { Signature } from '../signatures';
import { createDidSig } from '../utils/did';

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
   * @param {object} addBlob - struct to store on chain and nonce
   * @param {object} signature - Signature to use
   * @return {object} The extrinsic to sign and send.
   */
  createNewTx(addBlob, signature) {
    return this.module.new(addBlob, signature);
  }

  /**
   * Register a new Blob on the Dock Chain
   * @param {object} addBlob - struct to store on chain
   * @param {object} signature - Signature to use
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async new(addBlob, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createNewTx(addBlob, signature), waitForFinalization, params);
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

  async createSignedAddBlob(didModule, blob, hexDid, keyPair, keyId, nonce = undefined) {
    if (!blob.blob) {
      throw new Error('Blob must have a value!');
    }

    const blobObj = {
      ...blob,
      blob: this.getSerializedBlobValue(blob.blob),
    };

    if (nonce === undefined) {
      nonce = await didModule.getNextNonceForDID(hexDid);
    }
    const addBlob = {
      blob: blobObj,
      nonce,
    };
    const serializedAddBlob = this.getSerializedBlob(addBlob);
    const signature = getSignatureFromKeyringPair(keyPair, serializedAddBlob);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [addBlob, didSig];
  }

  getSerializedBlobValue(blobValue) {
    if (blobValue instanceof Uint8Array) {
      return [...blobValue];
    } else if (typeof blobValue === 'object') {
      return stringToHex(JSON.stringify(blobValue));
    } else if (typeof blobValue === 'string' && !isHexWithGivenByteSize(blobValue)) {
      return stringToHex(blobValue);
    }
    // Assuming `blobValue` is in hex
    return blobValue;
  }

  /**
   * Serializes the `Blob` (for signing before sending to the node)
   * @param {object} blob - `Blob` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedBlob(blob) {
    return getStateChange(this.api, 'AddBlob', blob);
  }
}

export default BlobModule;
