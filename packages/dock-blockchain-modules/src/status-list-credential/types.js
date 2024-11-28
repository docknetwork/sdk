import { TypedStruct } from '@docknetwork/credential-sdk/types/generic';
import {
  DockStatusListCredentialId,
  DockStatusList2021Credential,
  OneOfPolicy,
} from '@docknetwork/credential-sdk/types';

export class DockStatusListCredentialWrappedId extends TypedStruct {
  static Classes = {
    id: DockStatusListCredentialId,
  };
}

export class DockStatusList2021CredentialWithPolicy extends TypedStruct {
  static Classes = {
    statusListCredential: DockStatusList2021Credential,
    policy: OneOfPolicy,
  };
}

export class DockStatusList2021CredentialWithPolicyWithId extends TypedStruct {
  static Classes = {
    id: DockStatusListCredentialId,
    credential: DockStatusList2021CredentialWithPolicy,
  };
}

export class DockStatusList2021CredentialWithId extends TypedStruct {
  static Classes = {
    id: DockStatusListCredentialId,
    credential: DockStatusList2021Credential,
  };
}
