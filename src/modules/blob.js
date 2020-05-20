import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import NoBlobError from '../utils/errors/no-blob-error';

export const DockBlobMethod = 'dock';
export const DockBlobQualifier = `blob:${DockBlobMethod}:`;
export const DockBlobIdByteSize = 32;

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
