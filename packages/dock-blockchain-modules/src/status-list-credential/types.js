import { TypedStruct } from '@docknetwork/credential-sdk/types/generic';
import {
  DockStatusListCredentialIdValue,
  DockStatusList2021Credential,
  OneOfPolicy,
} from '@docknetwork/credential-sdk/types';

export class DockStatusListCredentialWrappedId extends TypedStruct {
  static Classes = {
    id: DockStatusListCredentialIdValue,
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
    id: DockStatusListCredentialIdValue,
    credential: DockStatusList2021CredentialWithPolicy,
  };
}

export class DockStatusList2021CredentialWithId extends TypedStruct {
  static Classes = {
    id: DockStatusListCredentialIdValue,
    credential: DockStatusList2021Credential,
  };
}
