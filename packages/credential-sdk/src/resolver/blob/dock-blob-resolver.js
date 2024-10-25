import { ensureInstanceOf } from "../../utils";
import BlobResolver from "./blob-resolver";
import { AbstractBlobModule } from "../../modules/abstract/blob";

class DockBlobResolver extends BlobResolver {
  static METHOD = "dock";

  /**
   * @param {DockAPI} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(blobModule) {
    super();

    /**
     * @type {DockAPI}
     */
    this.blobModule = ensureInstanceOf(blobModule, AbstractBlobModule);
  }

  async resolve(blobUri) {
    const [author, blob] = await this.blobModule.get(blobUri);

    return [String(author), blob.toObjectOrBytes()];
  }
}

/**
 * Resolves `Blob`s with identifier `blob:dock:*`.
 * @type {DockBlobResolver}
 */
export default DockBlobResolver;
