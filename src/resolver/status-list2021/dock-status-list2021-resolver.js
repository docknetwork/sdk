import { withInitializedDockAPI } from '../utils';
import StatusList2021Resolver from './status-list2021-resolver';

class DockStatusListResolver extends StatusList2021Resolver {
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

  async resolve(fullyQualifiedStatusListId) {
    const { id: dockStatusListId } = this.parse(fullyQualifiedStatusListId);

    const cred = await this.dock.statusListCredential.fetchStatusList2021Credential(
      dockStatusListId,
    );

    return cred?.toJSON();
  }
}

/**
 * Resolves `StatusList2021Credential`s with identifier `status-list2021:dock:*`.
 * @type {DockStatusListResolver}
 */
export default withInitializedDockAPI(DockStatusListResolver);
