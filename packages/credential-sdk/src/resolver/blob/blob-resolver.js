import { ensureInstanceOf } from '../../utils';
import { AbstractBlobModule } from '../../modules/abstract/blob';
import { Resolver } from '../generic';

class DockBlobResolver extends Resolver {
  prefix = 'blob';

  get method() {
    return this.blobModule.methods();
  }

  /**
   * @param {AbstractBlobModule}
   * @constructor
   */
  constructor(blobModule) {
    super();

    /**
     * @type {AbstractBlobModule}
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
