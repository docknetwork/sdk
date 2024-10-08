import { TrustRegistryId } from './id';
import { TypedMap, TypedStruct } from '../generic';
import { Issuers } from './issuer';
import { Verifiers } from './verifier';

export class TrustRegistrySchema extends TypedStruct {
  static Classes = {
    verifiers: Verifiers,
    issuers: Issuers,
  };
}

export class TrustRegistrySchemas extends TypedMap {
  static KeyClass = TrustRegistryId;

  static ValueClass = TrustRegistrySchema;
}
