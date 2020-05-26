import proofOfHealthCoreSchema from './proof_of_health_core';

const schema = {
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

// TODO: Use `$ref` instead. Some of the changes already done in other branch.
const properties = { ...proofOfHealthCoreSchema.properties, ...schema.properties };
schema.properties = properties;
export default schema;
