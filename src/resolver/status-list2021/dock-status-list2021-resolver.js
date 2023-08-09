import { withInitializedDockAPI } from '../utils';
import StatusList2021Resolver from './status-list2021-resolver';

/**
 * Resolves `status-list2021:dock:*` entities.
 */
export default withInitializedDockAPI(
  class DockStatusListResolver extends StatusList2021Resolver {
    static METHOD = 'dock';

    constructor(dock) {
      super();

      this.dock = dock;
    }

    async resolve(fullyQualifiedStatusListId) {
      const dockStatusListId = this.parse(fullyQualifiedStatusListId);

      const cred = await this.dock.statusListCredentialModule.fetchStatusList2021Credential(
        dockStatusListId,
      );

      return cred?.toJSON();
    }
  },
);
