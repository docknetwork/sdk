export default {
  'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw': {
    id: 'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw',
    type: 'EcdsaSecp256k1VerificationKey2019',
    publicKeyBase58: '222iuczftmixHLkW6wszwyeAfYCZA7bzQMhkEXpeNVJrk',
    '@context': 'https://w3id.org/security/v2',
    controller: 'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw',
  },
  'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw': {
    '@context': 'https://w3id.org/security/v2',
    id: 'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw',
    assertionMethod: [
      'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw',
    ],
    authentication: [
      'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw',
    ],
  },

  'urn:EcdsaSecp256k1VerificationKey2019#keys-1': {
    id: 'urn:EcdsaSecp256k1VerificationKey2019#keys-1',
    type: 'EcdsaSecp256k1VerificationKey2019',
    publicKeyBase58: '222iuczftmixHLkW6wszwyeAfYCZA7bzQMhkEXpeNVJrk',
    '@context': 'https://w3id.org/security/v2',
    controller: 'urn:EcdsaSecp256k1VerificationKey2019',
  },
  'urn:EcdsaSecp256k1VerificationKey2019': {
    '@context': 'https://w3id.org/security/v2',
    id: 'urn:EcdsaSecp256k1VerificationKey2019',
    assertionMethod: [
      'urn:EcdsaSecp256k1VerificationKey2019#keys-1',
    ],
    authentication: [
      'urn:EcdsaSecp256k1VerificationKey2019#keys-1',
    ],
  },

  'urn:JsonWebKey2020': {
    '@context': 'https://w3id.org/security/v2',
    id: 'urn:JsonWebKey2020',
    assertionMethod: [
      'urn:JsonWebKey2020#keys-1',
    ],
    authentication: [
      'urn:JsonWebKey2020#keys-1',
    ],
  },
  'urn:JsonWebKey2020#keys-1': {
    '@context': 'https://w3id.org/security/suites/jws-2020/v1',
    id: 'urn:JsonWebKey2020#keys-1',
    controller: 'urn:JsonWebKey2020',
    type: 'JsonWebKey2020',
    publicKeyJwk: {
      kty: 'EC',
      crv: 'P-384',
      x: 'dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk',
      y: 'viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E'
    },
  },
};
