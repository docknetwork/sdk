import { TypedBytes, sized } from '../generic';

export class TrustRegistryId extends TypedBytes {}

export class DockTrustRegistryId extends sized(TrustRegistryId) {
  static Size = 32;
}

export class TrustRegistrySchemaId extends TypedBytes {}

export class DockTrustRegistrySchemaId extends sized(TypedBytes) {
  static Size = 32;
}
