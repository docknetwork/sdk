export default {
  core_mods: {
    bbsPlusPublicKeyWithParams: {
      description: 'Return BBS+ public key with params',
      params: [
        {
          name: 'id',
          type: 'BBSPlusPublicKeyStorageKey',
        },
      ],
      type: 'Option<BBSPlusPublicKeyWithParams>',
    },
    bbsPlusParamsByDid: {
      description: 'Return all BBS+ params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<IncId, BBSPlusParameters>',
    },
    bbsPlusPublicKeysByDid: {
      description: 'Return all BBS+ key with params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<IncId, BBSPlusPublicKeyWithParams>',
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
};
