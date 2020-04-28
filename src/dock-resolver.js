import { validateDockDIDSS58Identifier } from './utils/did';
import DIDResolver from './did-resolver';

export default class DockResolver extends DIDResolver {
  /**
   * @param {DockAPI} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(dock) {
    super();
    this.dock = dock;
  }

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @returns {Promise<object>}
   */
  async resolve(did) {
    const methodName = 'dock';

    if (this.dock.isInitialized()) {
      const parsed = this.parseDid(did);
      if (parsed.method === methodName) {
        validateDockDIDSS58Identifier(parsed.id);
        return this.dock.did.getDocument(parsed.did);
      }
      throw new Error(`Resolver for ${methodName} does not support the ${parsed.method} did method.`);
    } else {
      throw new Error('DockAPI not connected');
    }
  }
}
