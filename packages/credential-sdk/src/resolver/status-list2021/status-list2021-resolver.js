import { ensureInstanceOf, ensureString } from '../../utils';
import AbstractStatusListCredentialModule from '../../modules/abstract/status-list-credential/module';
import { Resolver } from '../generic';
import jsonFetch from '../../utils/json-fetch';

const HTTP_PREFIXES = ['http://', 'https://'];
const STATUS_LIST_2021_TYPE = 'StatusList2021';
const STATUS_PURPOSES = new Set(['revocation', 'suspension']);

function isHttpUrl(id) {
  return HTTP_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function isStatusList2021CredentialLike(doc) {
  if (doc == null || typeof doc !== 'object') return false;

  const { credentialSubject } = doc;
  if (credentialSubject == null || typeof credentialSubject !== 'object') {
    return false;
  }

  return (
    credentialSubject.type === STATUS_LIST_2021_TYPE
    && typeof credentialSubject.encodedList === 'string'
    && STATUS_PURPOSES.has(credentialSubject.statusPurpose)
  );
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

      return isStatusList2021CredentialLike(doc) ? doc : null;
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
