export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Show if immunity by vaccination or testing',
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
    eventType: {
      type: 'string',
      enum: ['vaccination', 'antibody test'],
    },
    eventTime: {
      type: 'string',
      format: 'date-time',
    },
    eventBy: {
      type: 'string',
    },
    eventFacility: {
      type: 'string',
    },
    eventName: {
      type: 'string',
      enum: ['X-trans-23 vaccine', 'Serological Assay COVID-19'],
    },
    potencyDate: {
      type: 'string',
      format: 'date',
    },
  },
  required: ['firstName', 'firstInitial', 'lastName', 'lastInitial', 'photo', 'biometricTemplate', 'yearOfBirth',
    'eventType', 'eventTime', 'eventBy', 'eventFacility', 'eventName', 'potencyDate'],
};
