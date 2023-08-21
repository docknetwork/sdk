import { withInitializedDockAPI } from '../utils';
import StatusList2021Resolver from './status-list2021-resolver';

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
}

/**
 * Resolves `DID`s with identifier `did:dock:*`.
 * @type {DockStatusListResolver}
 */
export default withInitializedDockAPI(DockStatusListResolver);
