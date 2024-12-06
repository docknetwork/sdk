import {
  VerificationMethodSignature,
  CheqdDid,
  CheqdDIDDocument,
} from '@docknetwork/credential-sdk/types';
import {
  TypedArray,
  TypedString,
  TypedStruct,
  TypedBytesArray,
  TypedUUID,
} from '@docknetwork/credential-sdk/types/generic';

const createTypes = (Payload) => {
  const payloadWithSigsName = `CheqdPayloadWithSignatures(${Payload.name})`;
  const payloadWithTypeUrlAndSigsName = `CheqdPayloadWithTypeUrlAndSignatures(${Payload.name})`;

  const obj1 = {
    [payloadWithSigsName]: class extends TypedStruct {
      static Classes = {
        payload: Payload,
        signatures: class Signatures extends TypedArray {
          static Class = VerificationMethodSignature;
        },
      };
    },
  };
  const obj2 = {
    [payloadWithTypeUrlAndSigsName]: class extends TypedStruct {
      static Classes = {
        typeUrl: class TypeURL extends TypedString {},
        value: obj1[payloadWithSigsName],
      };
    },
  };

  // eslint-disable-next-line
  Payload.ResourcePayloadWithTypeUrlAndSignatures = obj2[payloadWithTypeUrlAndSigsName];

  return [
    obj1[payloadWithSigsName],
    obj2[payloadWithTypeUrlAndSigsName],
  ];
};

export class CheqdCreateResource extends TypedStruct {
  static Classes = {
    collectionId: class CollectionID extends TypedUUID {},
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

export class DeactivateDidDocument extends TypedStruct {
  static Classes = {
    id: CheqdDid,
    versionId: TypedUUID,
  };
}

export const [
  CheqdCreateResourcePayloadWithSignatures,
  CheqdCreateResourcePayloadWithTypeUrlAndSignatures,
] = createTypes(CheqdCreateResource);

export const [
  CheqdSetDidDocumentPayloadWithSignatures,
  CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
] = createTypes(CheqdDIDDocument);

export const [
  CheqdDeactivateDidDocumentPayloadWithSignatures,
  CheqdDeactivateDidDocumentPayloadWithTypeUrlAndSignatures,
] = createTypes(DeactivateDidDocument);
