import { encodeAddress, randomAsHex, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { isHexWithGivenByteSize } from '../utils/codec';
import NoBlobError from '../utils/errors/no-blob-error';

export const DockBlobMethod = 'dock';
export const DockBlobQualifier = `blob:${DockBlobMethod}:`;
export const DockBlobIdByteSize = 32;

// Maximum size of the blob in bytes
// implementer may choose to implement this as a dynamic config option settable with the `parameter_type!` macro
export const BLOB_MAX_BYTE_SIZE = 1024;

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
  if (id.startsWith(DockBlobQualifier)) {
    // Fully qualified ID. Remove the qualifier
    const ss58Did = id.slice(DockBlobQualifier.length);
    try {
      const hex = u8aToHex(decodeAddress(ss58Did));
      // 2 characters for `0x` and 2*byte size of ID
      if (hex.length !== (2 + 2 * DockBlobIdByteSize)) {
        throw new Error('Unexpected byte size');
      }
      return hex;
    } catch (e) {
      throw new Error(`Invalid SS58 ID ${id}. ${e}`);
    }
  } else {
    try {
      // Check if hex and of correct size and return the hex value if successful.
      validateBlobIDHexIdentifier(id);
      return id;
    } catch (e) {
      // Cannot parse as hex
      throw new Error(`Invalid hexadecimal ID ${id}. ${e}`);
    }
  }
}

/**
 * Create and return a fully qualified Dock Blob, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The Blob
 */
export function createNewDockBlobId() {
  const hexId = randomAsHex(DockBlobIdByteSize);
  return blobHexIdToQualified(hexId);
}

/**
 * Return a fully qualified Dock Blob, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The Blob
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
  constructor(api) {
    this.api = api;
    this.module = api.tx.blobStore;
  }

  /**
   * Register a new Blob on the Dock Chain
   * @param {object} blob - struct to store on chain
   * @param {object} keyPair - Key pair to sign with
   * @return {object} The extrinsic to sign and send.
   */
  new(blob, keyPair) {
    const serializedBlob = this.getSerializedBlob(blob);
    const signature = getSignatureFromKeyringPair(keyPair, serializedBlob);
    return this.module.new(blob, signature.toJSON());
  }

  /**
   *  Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Array>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async getBlob(id) {
    id.replace(DockBlobQualifier, '');
    const resp = await this.api.query.blobStore.blobs(id);
    if (resp.isNone) {
      throw new NoBlobError(id);
    }
    const tuple = resp.unwrap();
    return [tuple[0], tuple[1]];
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
