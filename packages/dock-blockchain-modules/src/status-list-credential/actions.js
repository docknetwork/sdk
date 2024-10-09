import {
  TypedStruct,
  TypedNumber,
} from '@docknetwork/credential-sdk/types/generic';
import {
  DockStatusList2021CredentialWithId,
  DockStatusList2021CredentialWithPolicyWithId,
  DockStatusListCredentialWrappedId,
} from './types';

export class CreateStatusListCredential extends TypedStruct {
  static Classes = {
    data: DockStatusList2021CredentialWithPolicyWithId,
    nonce: TypedNumber,
  };
}

export class UpdateStatusListCredential extends TypedStruct {
  static Classes = {
    data: DockStatusList2021CredentialWithId,
    nonce: TypedNumber,
  };
}

export class RemoveStatusListCredential extends TypedStruct {
  static Classes = {
    data: DockStatusListCredentialWrappedId,
    nonce: TypedNumber,
  };
}
