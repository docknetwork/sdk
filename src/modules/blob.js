import { getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { NoBlobError } from '../utils/blob';


export const DockBlobMethod = 'dock';
export const DockBlobQualifier = `blob:${DockBlobMethod}:`;
export const DockBlobByteSize = 32;


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
   * @param {Signature} signature - Signature from existing key
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
   * @returns {Promise<void>} TODO: fill proper docstring here
   */
  async getBlob(id) {
    id.replace(DockBlobQualifier, '');
    const resp = await this.api.query.blobStore.blobs(id);
    if (resp.isNone) {
      throw new NoBlobError(id);
    }
    //
    // const respTuple = resp.unwrap();
    // if (respTuple.length === 2) {
    //   return [
    //     respTuple[0],
    //     respTuple[1].toNumber(),
    //   ];
    // }
    // throw new Error(`Needed 2 items in response but got${respTuple.length}`);
  }

  /**
   * Serializes the `Blob` (for signing before sending to the node)
   * * @param {object} blob - `Blob` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedBlob(blob) {
    return getStateChange(this.api, 'Blob', blob);
  }


  /**
   * Create the fully qualified Blob id like "blob:dock:..."
   * @param {string} id - Blob id
   * @return {string} The full Blob identifier.
   */
  getFullyQualifiedBlobId(id) {
    return id.startsWith(DockBlobQualifier) ? id : `${DockBlobQualifier}${id}`;
  }
}

export default BlobModule;
