import {
  DockDidValue,
  Controllers,
  ServiceEndpoint,
  DidKey,
  SuffixServiceEndpointId,
} from '@docknetwork/credential-sdk/types';
import {
  TypedNumber,
  TypedStruct,
  TypedArray,
} from '@docknetwork/credential-sdk/types/generic';

export class AddKeys extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    keys: class DidKeys extends TypedArray {
      static Class = DidKey;
    },
    nonce: TypedNumber,
  };
}

export class AddControllers extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    controllers: Controllers,
    nonce: TypedNumber,
  };
}

export class AddServiceEndpoint extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    id: SuffixServiceEndpointId,
    endpoint: ServiceEndpoint,
    nonce: TypedNumber,
  };
}

export class RemoveKeys extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    keys: class Keys extends TypedArray {
      static Class = class KeyId extends TypedNumber {};
    },
    nonce: TypedNumber,
  };
}

export class RemoveControllers extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    controllers: Controllers,
    nonce: TypedNumber,
  };
}

export class RemoveServiceEndpoint extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    id: SuffixServiceEndpointId,
    nonce: TypedNumber,
  };
}

export class RemoveOnchainDid extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    nonce: TypedNumber,
  };
}
