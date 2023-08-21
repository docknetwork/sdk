import { withInitializedDockAPI } from '../utils';
import DIDResolver from './did-resolver';
import { validateDockDIDSS58Identifier } from '../../utils/did';

class DockDIDResolver extends DIDResolver {
  static METHOD = 'dock';

  constructor(dock) {
    super();

    this.dock = dock;
  }

  async resolve(qualifiedDid) {
    const { id, did } = this.parseDid(qualifiedDid);
    validateDockDIDSS58Identifier(id);

    return this.dock.did.getDocument(did);
  }
}

/**
 * Resolves `DID`s with identifier `did:dock:*`.
 * @type {DockDIDResolver}
 */
export default withInitializedDockAPI(DockDIDResolver);
