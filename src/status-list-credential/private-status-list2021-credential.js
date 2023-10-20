import { StatusList2021Credential } from '../index';
import { PrivateStatusList2021Qualifier } from '../utils/vc/constants';
import { ensurePrivateStatusListId } from '../utils/type-helpers';

/**
 * Private Status list 2021 verifiable credential. Similar to Status list 2021 credential but isn't stored on chain.
 * Issuer either keeps it with itself or shares it only with specific parties in charge of checking revocation
 */
export default class PrivateStatusList2021Credential extends StatusList2021Credential {
  toSubstrate() {
    throw new Error('This is not meant to be stored on chain');
  }

  static verifyID(id) {
    ensurePrivateStatusListId(id);
  }
}

PrivateStatusList2021Credential.qualifier = PrivateStatusList2021Qualifier;
