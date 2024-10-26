import { AbstractDIDModule } from '../../modules/abstract/did';
import DIDResolver from './did-resolver';
import { ensureInstanceOf } from '../../utils';

class DockDIDResolver extends DIDResolver {
  static METHOD = 'dock';

  /**
   * @param {DockAPI} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(didModule) {
    super();

    /**
     * @type {AbstractDIDModule}
     */
    this.didModule = ensureInstanceOf(didModule, AbstractDIDModule);
  }

  async resolve(qualifiedDid) {
    const { did } = this.parseDid(qualifiedDid);

    const document = await this.didModule.getDocument(did);

    return document.toJSON();
  }
}

/**
 * Resolves `DID`s with identifier `did:dock:*`.
 * @type {DockDIDResolver}
 */
export default DockDIDResolver;
