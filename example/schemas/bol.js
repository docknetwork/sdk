export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Detailed shipment document provided by the carrier to the receiver of products.',
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
    bolNumber: {
      type: 'string',
    },
    carrier: { $ref: '#/$defs/uri' },
    recipient: { $ref: '#/$defs/uri' },
    transportType: {
      type: 'string',
    },
    originAddress: { $ref: '#/$defs/address' },
    deliveryAddress: { $ref: '#/$defs/address' },
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
    freightChargeTerms: {
      type: 'string',
    },
    expectedDeliveryDates: {
      type: 'string',
      format: 'date',
    },
    comment: {
      type: 'string',
    },
  },
  required: ['productIdentifier', 'bolNumber', 'carrier', 'recipient', 'transportType', 'originAddress', 'deliveryAddress',
    'valuePerItem', 'totalOrderValue', 'freightChargeTerms', 'expectedDeliveryDates'],
  additionalProperties: true,
};
