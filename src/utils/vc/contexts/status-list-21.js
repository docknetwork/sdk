// Taken from https://w3c.github.io/vc-bitstring-status-list/contexts/v1.jsonld
export default {
  '@context': {
    '@protected': true,

    StatusList2021Credential: {
      '@id':
    'https://w3id.org/vc/status-list#StatusList2021Credential',
      '@context': {
        '@protected': true,

        id: '@id',
        type: '@type',

        description: 'https://schema.org/description',
        name: 'https://schema.org/name',
      },
    },

    StatusList2021: {
      '@id':
    'https://w3id.org/vc/status-list#StatusList2021',
      '@context': {
        '@protected': true,

        id: '@id',
        type: '@type',

        statusPurpose:
      'https://w3id.org/vc/status-list#statusPurpose',
        encodedList: 'https://w3id.org/vc/status-list#encodedList',
      },
    },

    StatusList2021Entry: {
      '@id':
    'https://w3id.org/vc/status-list#StatusList2021Entry',
      '@context': {
        '@protected': true,

        id: '@id',
        type: '@type',

        statusPurpose:
      'https://w3id.org/vc/status-list#statusPurpose',
        statusListIndex:
      'https://w3id.org/vc/status-list#statusListIndex',
        statusListCredential: {
          '@id':
        'https://w3id.org/vc/status-list#statusListCredential',
          '@type': '@id',
        },
      },
    },
  },
};