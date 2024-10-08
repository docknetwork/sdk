import {
  VerificationMethodSignature,
  CheqdDid,
} from '@docknetwork/credential-sdk/types';
import {
  Any,
  TypedArray,
  TypedString,
  TypedStruct,
  TypedBytesArray,
  TypedUUID,
} from '@docknetwork/credential-sdk/types/generic';

export class CheqdPayloadAndSignatures extends TypedStruct {
  static Classes = {
    payload: Any,
    signatures: class Signatures extends TypedArray {
      static Class = VerificationMethodSignature;
    },
  };
}

export class CheqdPayloadWithTypeUrl extends TypedStruct {
  static Classes = {
    typeUrl: TypedString,
    value: CheqdPayloadAndSignatures,
  };
}

export class CheqdCreateResource extends TypedStruct {
  static Classes = {
    collectionId: TypedUUID,
    id: class ResourceId extends TypedUUID {},
    version: class Version extends TypedString {},
    alsoKnownAs: class AlsoKnownAs extends TypedArray {
      static Class = CheqdDid;
    },
    name: class Name extends TypedString {},
    resourceType: class ResourceType extends TypedString {},
    data: class Data extends TypedBytesArray {},
  };
}
