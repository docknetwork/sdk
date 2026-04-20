import { ensureInstanceOf, ensureString } from '../../utils';
import AbstractStatusListCredentialModule from '../../modules/abstract/status-list-credential/module';
import { Resolver } from '../generic';
import jsonFetch from '../../utils/json-fetch';
import { StatusList2021Credential } from '../../vc';

const HTTP_PREFIXES = ['http://', 'https://'];

function isHttpUrl(id) {
  return HTTP_PREFIXES.some((prefix) => id.startsWith(prefix));
}

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

  supports(id) {
    const identifier = ensureString(id);

    return isHttpUrl(identifier) || super.supports(identifier);
  }

  async resolve(id) {
    const identifier = ensureString(id);
    if (isHttpUrl(identifier)) {
      const doc = await jsonFetch(identifier);

      try {
        return StatusList2021Credential.fromJSON(doc).toJSON();
      } catch {
        return null;
      }
    }

    const cred = await this.statusListCredentialModule.getStatusListCredential(identifier);

    return cred?.toJSON ? cred.toJSON() : cred ?? null;
  }
}

/**
 * Resolves `StatusList2021Credential`s with identifier `status-list2021:*` or `http(s)` URL.
 * @type {StatusListResolver}
 */
export default StatusListResolver;
