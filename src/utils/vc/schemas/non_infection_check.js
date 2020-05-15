export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Found virus free after testing',
  type: 'object',
  $defs: {
    uri: {
      type: 'string',
      format: 'uri',
    },
  },
  properties: {
    // TODO: Change the id once blob integration is done in SDK
    firstName: { $ref: '/blob:dock:0x123/firstName' },
    firstInitial: { $ref: '/blob:dock:0x123/firstInitial' },
    lastName: { $ref: '/blob:dock:0x123/lastName' },
    lastInitial: { $ref: '/blob:dock:0x123/lastInitial' },
    yearOfBirth: { $ref: '/blob:dock:0x123/yearOfBirth' },
    photo: { $ref: '/blob:dock:0x123/photo' },
    biometricTemplate: { $ref: '/blob:dock:0x123/biometricTemplate' },
    virus: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
      },
    },
    checkTime: {
      type: 'string',
      format: 'date-time',
    },
    checkLocation: {
      type: 'string',
    },
    checkedBy: {
      type: 'string',
    },
    checkFacility: {
      type: 'string',
    },
    diagnosisMethods: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
      },
    },
  },
  required: ['firstName', 'firstInitial', 'lastName', 'lastInitial', 'photo', 'biometricTemplate', 'yearOfBirth',
    'virus', 'checkTime', 'checkLocation', 'checkedBy', 'checkFacility', 'diagnosisMethods'],
};
