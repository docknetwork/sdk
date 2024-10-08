export default {
  '@context': {
    PrivateStatusList2021Credential: {
      '@id': 'https://ld.dock.io/security#PrivateStatusList2021Credential',
      '@context': {
        id: '@id',
        type: '@type',
        description: 'https://schema.org/description',
        name: 'https://schema.org/name',
      },
    },

    StatusList2021: {
      '@id': 'https://w3id.org/vc/status-list#StatusList2021',
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        statusPurpose: 'https://w3id.org/vc/status-list#statusPurpose',
        encodedList: 'https://w3id.org/vc/status-list#encodedList',
      },
    },

    PrivateStatusList2021Entry: {
      '@id': 'https://w3id.org/vc/status-list#StatusList2021Entry',
      '@context': {
        id: '@id',
        type: '@type',
        statusPurpose: 'https://w3id.org/vc/status-list#statusPurpose',
        statusListIndex: 'https://w3id.org/vc/status-list#statusListIndex',
        statusListCredential: {
          '@id': 'https://ld.dock.io/security#PrivateStatusListCredential',
          '@type': '@id',
        },
      },
    },
  },
};
