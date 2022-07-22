export default {
  core_mods: {
    bbsPlusPublicKeyWithParams: {
      description: 'Return BBS+ public key with params',
      params: [
        {
          name: 'id',
          type: 'PublicKeyStorageKey',
        },
      ],
      type: 'Option<BbsPlusPublicKeyWithParams>',
    },
    bbsPlusParamsByDid: {
      description: 'Return all BBS+ params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<u32, BbsPlusParameters>',
    },
    bbsPlusPublicKeysByDid: {
      description: 'Return all BBS+ key with params by a DID',
      params: [
        {
          name: 'did',
          type: 'Did',
        },
      ],
      type: 'BTreeMap<u32, BbsPlusPublicKeyWithParams>',
    },
    accumulatorPublicKeyWithParams: {
      description: 'Return Accumulator public key with params',
      params: [
        {
          name: 'id',
          type: 'PublicKeyStorageKey',
        },
      ],
      type: 'Option<AccumulatorPublicKeyWithParams>',
    },
    accumulatorWithPublicKeyAndParams: {
      description: 'Return Accumulator public key with params',
      params: [
        {
          name: 'id',
          type: 'AccumulatorId',
        },
      ],
      type: 'Option<(Vec<u8>, Option<AccumulatorPublicKeyWithParams>)>',
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
          type: 'Option<u8>',
          isOptional: true,
        },
      ],
      type: 'Option<AggregatedDidDetailsResponse>',
    },
  },
};
