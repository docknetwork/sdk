import proofOfHealthCoreSchema from './proof_of_health_core';

const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  // TODO: Use a proper id once blob integration is done in SDK
  description: 'Diagnosis with viral infection on a particular date',
  type: 'object',
  $defs: {
    uri: {
      type: 'string',
      format: 'uri',
    },
  },
  properties: {
    diagnosisCode: {
      type: 'string',
      enum: ['CodeA', 'CodeB', 'CodeC'],
    },
    diagnosisTime: {
      type: 'string',
      format: 'date-time',
    },
    diagnosisLocation: {
      type: 'string',
    },
    diagnosedBy: {
      type: 'string',
    },
    diagnosisFacility: {
      type: 'string',
    },
    diagnosisMethods: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
      },
    },
    declaredSafeDate: {
      type: 'string',
      format: 'date',
    },
  },
  required: ['firstName', 'firstInitial', 'lastName', 'lastInitial', 'photo', 'biometricTemplate', 'yearOfBirth',
    'diagnosisCode', 'diagnosisTime', 'diagnosisLocation', 'diagnosedBy', 'diagnosisFacility', 'diagnosisMethods', 'declaredSafeDate'],
};

// TODO: Use `$ref` instead. Some of the changes already done in other branch.
const properties = { ...proofOfHealthCoreSchema.properties, ...schema.properties };
schema.properties = properties;
export default schema;
