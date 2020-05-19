export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  // TODO: Use a proper id once blob integration is done in SDK
  id: '/blob:dock:0x123',
  description: 'Common fields of proof of health schemas',
  type: 'object',
  $defs: {
    uri: {
      type: 'string',
      format: 'uri',
    },
  },
  properties: {
    firstName: {
      type: 'string',
    },
    firstInitial: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    lastInitial: {
      type: 'string',
    },
    yearOfBirth: {
      type: 'integer',
      minimum: 1920,
      maximum: 2015,
    },
    photo: { $ref: '#/$defs/uri' },
    biometricTemplate: {
      type: 'object',
      minProperties: 1,
      properties: {
        fingerprint: {
          type: 'string',
        },
        retina: {
          type: 'string',
        },
        voice: {
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  required: ['firstName', 'firstInitial', 'lastName', 'lastInitial', 'photo', 'biometricTemplate', 'yearOfBirth'],
};
