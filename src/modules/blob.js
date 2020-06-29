import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { isHexWithGivenByteSize, getHexIdentifier } from '../utils/codec';
import NoBlobError from '../utils/errors/no-blob-error';
import Signature from '../signatures/signature'; // eslint-disable-line

export const DockBlobQualifier = 'blob:dock:';
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
  constructor(api, sendTransaction) {
    this.api = api;
    this.module = api.tx.blobStore;
    this.sendTransaction = sendTransaction;
  }

  /**
   * Register a new Blob on the Dock Chain
   * @param {object} blob - struct to store on chain
   * @param {object} keyPair - Key pair to sign with
   * @param {Signature} signature - Signature to use
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  async new(blob, keyPair = undefined, signature = undefined) {
    if (!signature) {
      if (!keyPair) {
        throw Error('You need to provide either a keypair or a signature to register a new Blob.');
      }
      const serializedBlob = this.getSerializedBlob(blob);
      // eslint-disable-next-line no-param-reassign
      signature = getSignatureFromKeyringPair(keyPair, serializedBlob);
    }
    return await this.sendTransaction(this.module.new(blob, signature.toJSON()), false);
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
      return [respTuple[0], respTuple[1]];
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
