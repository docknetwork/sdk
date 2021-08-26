import proofOfHealthCoreSchema from './proof_of_health_core';

const schema = {
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

// TODO: Use `$ref` instead. Some of the changes already done in other branch.
const properties = { ...proofOfHealthCoreSchema.properties, ...schema.properties };
schema.properties = properties;
export default schema;
