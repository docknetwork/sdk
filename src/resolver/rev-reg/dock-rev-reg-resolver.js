import { withInitializedDockAPI } from '../utils';
import RevRegResolver from './rev-reg-resolver';

class DockRevRegResolver extends RevRegResolver {
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

  async resolve(revRegId) {
    const { regId, revId } = this.parse(revRegId);

    return await this.dock.revocation.getIsRevoked(regId, revId);
  }
}

/**
 * Resolves revocation status with identifier `rev-reg:dock:*`.
 * @type {DockRevRegResolver}
 */
export default withInitializedDockAPI(DockRevRegResolver);
