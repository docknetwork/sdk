import {
  TypedArray,
  TypedNumber,
  TypedStruct,
  TypedString,
  TypedMap,
} from '@docknetwork/credential-sdk/types/generic';
import {
  DockTrustRegistryId,
  DockTrustRegistrySchemaId,
  TrustRegistrySchema,
  DockDidOrDidMethodKey,
} from '@docknetwork/credential-sdk/types';
import { TrustRegistryParticipantInformation } from '@docknetwork/credential-sdk/types/trust-registry';

export class TrustRegistryIdWithParticipants extends TypedStruct {
  static Classes = {
    registryId: DockTrustRegistryId,
    participants: class Participants extends TypedArray {
      static Class = DockDidOrDidMethodKey;
    },
  };
}

export class InitOrUpdateTrustRegistry extends TypedStruct {
  static Classes = {
    registryId: DockTrustRegistryId,
    name: TypedString,
    govFramework: TypedString,
    nonce: TypedNumber,
  };
}

class Schemas extends TypedMap {
  static KeyClass = DockTrustRegistrySchemaId;

  static ValueClass = TrustRegistrySchema;
}

export class SetSchemasMetadata extends TypedStruct {
  static Classes = {
    Set: Schemas,
  };
}

export class ChangeParticipants extends TypedStruct {
  static Classes = {
    data: TrustRegistryIdWithParticipants,
    nonce: TypedNumber,
  };
}

export class SetParticipantInformation extends TypedStruct {
  static Classes = {
    registryId: DockTrustRegistryId,
    participant: DockDidOrDidMethodKey,
    participantInformation: TrustRegistryParticipantInformation,
  };
}
