export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Permit document for import/export of shipments that have not been cleared by US Customs.',
  type: 'object',
  $defs: {
    uri: {
      type: 'string',
      format: 'uri',
    },
    address: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
        },
        latitude: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
      },
    },
  },
  properties: {
    productIdentifier: {
      type: 'string',
      format: 'uuid',
    },
    inBondNumber: {
      type: 'string',
    },
    inBondType: {
      type: 'string',
    },
    portOfEntry: {
      type: 'string',
    },
    irsNumber: {
      type: 'string',
    },
    carrier: { $ref: '#/$defs/uri' },
    recipient: { $ref: '#/$defs/uri' },
    transportType: {
      type: 'string',
    },
    originAddress: { $ref: '#/$defs/address' },
    deliveryAddress: { $ref: '#/$defs/address' },
    bolNumber: {
      type: 'string',
    },
    valuePerItem: {
      type: 'number',
      minimum: 0,
      maximum: 1000,
    },
    totalOrderValue: {
      type: 'number',
      minimum: 0,
      maximum: 1000000,
    },
    expectedDeliveryDates: {
      type: 'string',
      format: 'date',
    },
    comment: {
      type: 'string',
    },
  },
  required: ['productIdentifier', 'inBondNumber', 'inBondType', 'portOfEntry', 'irsNumber', 'bolNumber', 'carrier', 'recipient', 'transportType', 'originAddress', 'deliveryAddress', 'valuePerItem', 'totalOrderValue', 'comment', 'expectedDeliveryDates'],
  additionalProperties: false,
};
