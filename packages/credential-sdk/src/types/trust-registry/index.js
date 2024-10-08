import { TypedMap, TypedString, TypedStruct } from '../generic';
import { DockDidOrDidMethodKey } from '../did';
import { TrustRegistrySchemas } from './schema';
import { TrustRegistryId } from './id';

export class TrustRegistryInfo extends TypedStruct {
  static Classes = {
    name: class Name extends TypedString {},
    govFramework: class GovFramework extends TypedString {},
    convener: class Convener extends DockDidOrDidMethodKey {},
  };
}

export class TrustRegistryParticipantInformation extends TypedStruct {
  static Classes = {
    orgName: class OrgName extends TypedString {},
    logo: class Logo extends TypedString {},
    description: class Description extends TypedString {},
  };
}

export class TrustRegistry extends TypedStruct {
  static Classes = {
    info: TrustRegistryInfo,
    schemas: TrustRegistrySchemas,
  };
}

export class TrustRegistries extends TypedMap {
  static KeyClass = TrustRegistryId;

  static ValueClass = TrustRegistry;
}

export * from './id';
export * from './issuer';
export * from './schema';
export * from './verifier';
