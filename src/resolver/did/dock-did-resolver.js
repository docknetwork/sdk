import { withInitializedDockAPI } from '../utils';
import { validateDockDIDSS58Identifier } from '../../did';
import DIDResolver from './did-resolver';

class DockDIDResolver extends DIDResolver {
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

  async resolve(qualifiedDid) {
    const { id, did } = this.parseDid(qualifiedDid);
    validateDockDIDSS58Identifier(id);

    return await this.dock.did.getDocument(did);
  }
}

/**
 * Resolves `DID`s with identifier `did:dock:*`.
 * @type {DockDIDResolver}
 */
export default withInitializedDockAPI(DockDIDResolver);
