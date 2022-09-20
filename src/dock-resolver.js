import { validateDockDIDSS58Identifier } from './utils/did';
import DIDResolver from './did-resolver';

const methodName = 'dock';

export default class DockResolver extends DIDResolver {
  /**
   * @param {any} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(dock) {
    super();
    this.dock = dock;
  }

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} didUrl - The full DID
   * @returns {Promise<object>}
   */
  async resolve(didUrl) {
    if (this.dock.isInitialized()) {
      const parsed = this.parseDid(didUrl);
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
