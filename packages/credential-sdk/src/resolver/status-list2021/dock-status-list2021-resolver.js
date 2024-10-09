import { ensureInstanceOf } from '../../utils';
import AbstractStatusListCredentialModule from '../../modules/status-list-credential/module';
import StatusList2021Resolver from './status-list2021-resolver';

class DockStatusListResolver extends StatusList2021Resolver {
  static METHOD = 'dock';

  /**
   * @param {AbstractStatusListCredentialModule} statusListCredentialModule
   * @constructor
   */
  constructor(statusListCredentialModule) {
    super();

    /**
     * @type {AbstractStatusListCredentialModule}
     */
    this.statusListCredentialModule = ensureInstanceOf(
      statusListCredentialModule,
      AbstractStatusListCredentialModule,
    );
  }

  async resolve(fullyQualifiedStatusListId) {
    const { id: dockStatusListId } = this.parse(fullyQualifiedStatusListId);

    const cred = await this.statusListCredentialModule.getStatusListCredential(
      dockStatusListId,
    );

    return cred?.value.list.toJSON();
  }
}

/**
 * Resolves `StatusList2021Credential`s with identifier `status-list2021:dock:*`.
 * @type {DockStatusListResolver}
 */
export default DockStatusListResolver;
