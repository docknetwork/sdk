import {
  DockStatusListCredentialId,
  OneOfPolicy,
} from '@docknetwork/credential-sdk/types';
import { option } from '@docknetwork/credential-sdk/types/generic';
import {
  DockStatusList2021CredentialWithPolicy,
  DockStatusList2021CredentialWithId,
  DockStatusListCredentialWrappedId,
} from './types';

import {
  RemoveStatusListCredential,
  UpdateStatusListCredential,
} from './actions';
import { createInternalDockModule } from '../common';

const accountMethods = {
  create(statusListCredentialId, statusListCredential, did) {
    const credentialWithPolicy = new DockStatusList2021CredentialWithPolicy(
      statusListCredential,
      new OneOfPolicy([did]),
    );

    return [
      DockStatusListCredentialId.from(statusListCredentialId).value,
      credentialWithPolicy,
    ];
  },
};

const didMethodsWithPolicy = {
  update(id, statusListCredential, _, __, nonce) {
    return new UpdateStatusListCredential(
      new DockStatusList2021CredentialWithId(
        DockStatusListCredentialId.from(id),
        statusListCredential,
      ),
      nonce,
    );
  },
  remove(id, _, __, nonce) {
    return new RemoveStatusListCredential(
      new DockStatusListCredentialWrappedId(
        DockStatusListCredentialId.from(id),
      ),
      nonce,
    );
  },
};

/**
 * Module supporting `StatusList2021Credential` and `RevocationList2020Credential`.
 */
export default class DockInternalStatusListCredentialModule extends createInternalDockModule(
  { accountMethods, didMethodsWithPolicy },
) {
  static Prop = 'statusListCredential';

  static MethodNameOverrides = {
    update: 'UpdateStatusListCredential',
    remove: 'RemoveStatusListCredential',
  };

  async statusListCredential(id) {
    return option(DockStatusList2021CredentialWithPolicy).from(
      await this.query.statusListCredentials(
        DockStatusListCredentialId.from(id).value,
      ),
    );
  }
}
