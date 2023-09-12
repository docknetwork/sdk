import BlobResolver from './blob-resolver';
import { withInitializedDockAPI } from '../utils';

class DockBlobResolver extends BlobResolver {
  static METHOD = 'dock';

  /**
   * @param {DockAPI} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(dock) {
    super();

    /**
     * @type {DockAPI}
     */
    this.dock = dock;
  }

  async resolve(blobUri) {
    return await this.dock.blob.get(blobUri);
  }
}

/**
 * Resolves `Blob`s with identifier `blob:dock:*`.
 * @type {DockBlobResolver}
 */
export default withInitializedDockAPI(DockBlobResolver);
