export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Health Care Worker Passport',
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
    lastName: {
      type: 'string',
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
    degreeHeld: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        minProperties: 1,
        properties: {
          institution: {
            type: 'string',
          },
          degree: {
            type: 'string',
          },
        },
        additionalProperties: true,
      },
    },
    licenses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        minProperties: 4,
        properties: {
          licenseName: {
            type: 'string',
          },
          licenser: {
            type: 'string',
          },
          licensedFor: {
            type: 'string',
          },
          expiresDate: {
            type: 'string',
            format: 'date',
          },
        },
        additionalProperties: true,
      },
    },
  },
  required: ['firstName', 'lastName', 'photo', 'biometricTemplate', 'degreeHeld', 'licenses'],
};
