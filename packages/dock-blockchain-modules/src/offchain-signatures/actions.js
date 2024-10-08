import {
  OffchainSignatureParams,
  OffchainSignaturePublicKey,
  DockDidValue,
  DockOffchainSignatureKeyRef,
  DockOffchainSignatureParamsRef,
} from '@docknetwork/credential-sdk/types';
import {
  TypedStruct,
  TypedNumber,
} from '@docknetwork/credential-sdk/types/generic';

export class AddOffchainSignaturePublicKey extends TypedStruct {
  static Classes = {
    key: OffchainSignaturePublicKey,
    did: DockDidValue,
    nonce: TypedNumber,
  };
}

export class RemoveOffchainSignaturePublicKey extends TypedStruct {
  static Classes = {
    keyRef: DockOffchainSignatureKeyRef,
    did: DockDidValue,
    nonce: TypedNumber,
  };
}

export class AddOffchainSignatureParams extends TypedStruct {
  static Classes = { params: OffchainSignatureParams, nonce: TypedNumber };
}

export class RemoveOffchainSignatureParams extends TypedStruct {
  static Classes = {
    paramsRef: DockOffchainSignatureParamsRef,
    nonce: TypedNumber,
  };
}
