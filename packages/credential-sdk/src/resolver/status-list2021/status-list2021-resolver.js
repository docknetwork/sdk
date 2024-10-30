import { ensureInstanceOf } from '../../utils';
import AbstractStatusListCredentialModule from '../../modules/abstract/status-list-credential/module';
import { Resolver } from '../generic';

class StatusListResolver extends Resolver {
  prefix = 'status-list2021';

  get method() {
    return this.statusListCredentialModule.methods();
  }

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

  async resolve(id) {
    const cred = await this.statusListCredentialModule.getStatusListCredential(
      id,
    );

    return cred?.value.list.toJSON();
  }
}

/**
 * Resolves `StatusList2021Credential`s with identifier `status-list2021:dock:*`.
 * @type {StatusListResolver}
 */
export default StatusListResolver;
