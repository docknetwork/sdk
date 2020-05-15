export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Permanent Resident Card',
  type: 'object',
  $defs: {
    uri: {
      type: 'string',
      format: 'uri',
    },
  },
  properties: {
    id: { $ref: '#/$defs/uri' },
    type: {
      type: 'array',
      items: { type: 'string' },
    },
    givenName: {
      type: 'string',
    },
    familyName: {
      type: 'string',
    },
    gender: {
      type: 'string',
    },
    image: { $ref: '#/$defs/uri' },
    lprCategory: {
      type: 'string',
    },
    commuterClassification: {
      type: 'string',
    },
    lprNumber: {
      type: 'string',
    },
    residentSince: {
      type: 'string',
      format: 'date',
    },
    birthDate: {
      type: 'string',
      format: 'date',
    },
  },
  required: ['id', 'type', 'givenName', 'familyName', 'gender', 'image', 'lprCategory',
    'commuterClassification', 'lprNumber', 'residentSince', 'birthDate'],
};
