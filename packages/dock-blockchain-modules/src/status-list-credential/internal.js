import {
  DockStatusListCredentialId,
  OneOfPolicy,
} from '@docknetwork/credential-sdk/types';
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
  create(id, statusListCredential) {
    const [did, id] = DockStatusCredentialId.from(id).value;
    const credentialWithPolicy = new DockStatusList2021CredentialWithPolicy(
      statusListCredential,
      new OneOfPolicy([did]),
    );

    return [DockStatusListCredentialId.from(id), credentialWithPolicy];
  },
};

const didMethodsWithPolicy = {
  update(id, statusListCredential, _, __, nonce) {
    return new UpdateStatusListCredential(
      new DockStatusList2021CredentialWithId(id, statusListCredential),
      nonce,
    );
  },
  remove(statusListCredentialId, _, __, nonce) {
    return new RemoveStatusListCredential(
      new DockStatusListCredentialWrappedId(statusListCredentialId),
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
}
