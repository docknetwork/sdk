const SignaturePublicKeyStorageKey = '(Did, IncId)';

export default {
  core_mods: {
    psPublicKeyWithParams: {
      description: 'Return PS public key with params',
      params: [
        {
          name: 'id',
          type: SignaturePublicKeyStorageKey,
        },
      ],
      type: 'Option<(PsPublicKey, Option<PsParameters>)>',
    },
    psParamsByDid: {
      description: 'Return all PS params by a DID',
      params: [
        {
          name: 'did',
          type: 'DidOrDidMethodKey',
        },
      ],
      type: 'BTreeMap<IncId, PsParameters>',
    },
    psPublicKeysByDid: {
      description: 'Return all PS key with params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<IncId, (PsPublicKey, Option<PsParameters>)>',
    },
    bbsPublicKeyWithParams: {
      description: 'Return BBS public key with params',
      params: [
        {
          name: 'id',
          type: SignaturePublicKeyStorageKey,
        },
      ],
      type: 'Option<(BbsPublicKey, Option<BbsParameters>)>',
    },
    bbsParamsByDid: {
      description: 'Return all BBS params by a DID',
      params: [
        {
          name: 'did',
          type: 'DidOrDidMethodKey',
        },
      ],
      type: 'BTreeMap<IncId, BbsParameters>',
    },
    bbsPublicKeysByDid: {
      description: 'Return all BBS key with params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<IncId, (BbsPublicKey, Option<BbsParameters>)>',
    },
    bbsPlusPublicKeyWithParams: {
      description: 'Return BBS+ public key with params',
      params: [
        {
          name: 'id',
          type: SignaturePublicKeyStorageKey,
        },
      ],
      type: 'Option<(BbsPlusPublicKey, Option<BbsPlusParameters>)>',
    },
    bbsPlusParamsByDid: {
      description: 'Return all BBS+ params by a DID',
      params: [
        {
          name: 'did',
          type: 'DidOrDidMethodKey',
        },
      ],
      type: 'BTreeMap<IncId, BbsPlusParameters>',
    },
    bbsPlusPublicKeysByDid: {
      description: 'Return all BBS+ key with params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<IncId, (BbsPlusPublicKey, Option<BbsPlusParameters>)>',
    },
    accumulatorPublicKeyWithParams: {
      description: 'Return Accumulator public key with params',
      params: [
        {
          name: 'id',
          type: 'AccumPublicKeyStorageKey',
        },
      ],
      type: 'Option<AccumPublicKeyWithParams>',
    },
    accumulatorWithPublicKeyAndParams: {
      description: 'Return Accumulator public key with params',
      params: [
        {
          name: 'id',
          type: 'AccumulatorId',
        },
      ],
      type: 'Option<(Vec<u8>, Option<AccumPublicKeyWithParams>)>',
    },
    didDetails: {
      description: 'Get all keys, controllers and service endpoints of the DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
        {
          name: 'params',
          type: 'u8',
          isOptional: true,
        },
      ],
      type: 'Option<AggregatedDidDetailsResponse>',
    },
    didListDetails: {
      description: 'Get all keys, controllers and service endpoints of the DID',
      params: [
        {
          name: 'dids',
          type: 'Vec<Did>',
        },
        {
          name: 'params',
          type: 'u8',
          isOptional: true,
        },
      ],
      type: 'Vec<Option<AggregatedDidDetailsResponse>>',
    },
  },
  trustRegistry: {
    schemaMetadata: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
      ],
      type: 'BTreeMap<TrustRegistryId, AggregatedTrustRegistrySchemaMetadata>',
    },
    schemaIssuers: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
      ],
      type: 'BTreeMap<TrustRegistryId, Vec<(Issuer, AggregatedIssuerInfo)>>',
    },
    schemaVerifiers: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
      ],
      type: 'BTreeMap<TrustRegistryId, TrustRegistrySchemaVerifiers>',
    },
    schemaMetadataInRegistry: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'Option<AggregatedTrustRegistrySchemaMetadata>',
    },
    schemaIssuersInRegistry: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'Option<Vec<(Issuer, AggregatedIssuerInfo)>>',
    },
    schemaVerifiersInRegistry: {
      params: [
        {
          name: 'id',
          type: 'TrustRegistrySchemaId',
        },
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'Option<TrustRegistrySchemaVerifiers>',
    },
    allRegistrySchemaMetadata: {
      params: [
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'BTreeMap<TrustRegistrySchemaId, AggregatedTrustRegistrySchemaMetadata>',
    },
    allRegistrySchemaIssuers: {
      params: [
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'BTreeMap<TrustRegistrySchemaId, Vec<(Issuer, AggregatedIssuerInfo)>>',
    },
    allRegistrySchemaVerifiers: {
      params: [
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'BTreeMap<TrustRegistrySchemaId, TrustRegistrySchemaVerifiers>',
    },
    registriesInfoBy: {
      params: [
        {
          name: 'by',
          type: 'QueryTrustRegistriesBy',
        },
      ],
      type: 'BTreeMap<TrustRegistryId, TrustRegistryInfo>',
    },
    registrySchemaMetadataBy: {
      params: [
        {
          name: 'by',
          type: 'QueryTrustRegistryBy',
        },
        {
          name: 'registry_id',
          type: 'TrustRegistryId',
        },
      ],
      type: 'BTreeMap<TrustRegistrySchemaId, AggregatedTrustRegistrySchemaMetadata>',
    },
  },
};
