import {
  MAX_NUMBER,
  MIN_NUMBER,
  EPSILON_NUMBER,
  EPSILON_INT,
  pexToBounds,
} from '../../src/pex/pex-bounds';

import getNumberRange from '../data/pex/numberrange-pexv2.json';
import getNumberGreaterThan0 from '../data/pex/numbergreaterthan0-pexv2.json';
import getNumberLessThan from '../data/pex/numberlessthan-pexv2.json';
import getNumberRangeMutliPath from '../data/pex/numberrange-multipath-pexv2.json';
import getIntegerRange from '../data/pex/integerrange-pexv2.json';

import getUniversityDegreeDateBetween from '../data/pex/unidegree-datebetween-pexv2.json';
import getUniversityDegreeDateGreaterThan from '../data/pex/unidegree-dategreaterthan-pexv2.json';
import getUniversityDegreeDateRanged from '../data/pex/unidegree-dateranged-pexv2.json';

import noPathPexV2 from '../data/pex/no-path-pexv2.json';

import miscCredential from '../data/vcs/misccredential.json';

const MAXDATE_STR = '+030000-01-01T03:00:00.000Z';
const MINDATE_STR = '1412-07-11T17:39:15.585Z';

const blankCredential = {};

describe('pexToBounds utilities', () => {
  describe('basic bounds conversion', () => {
    test('getIntegerRange', () => {
      const bounds = pexToBounds(getIntegerRange.presentation_definition, [blankCredential]);
      expect(bounds).toEqual([
        [
          {
            attributeName: 'credentialSubject.number',
            format: undefined,
            min: EPSILON_INT,
            max: 123123 - EPSILON_INT,
            type: 'integer',
          },
        ],
      ]);
    });

    test('getNumberRange', () => {
      const bounds = pexToBounds(getNumberRange.presentation_definition, [blankCredential]);
      expect(bounds).toEqual([
        [
          {
            attributeName: 'credentialSubject.number',
            format: undefined,
            min: EPSILON_NUMBER,
            max: 123123 - EPSILON_NUMBER,
            type: 'number',
          },
        ],
      ]);
    });

    test('getNumberGreaterThan0', () => {
      const bounds = pexToBounds(getNumberGreaterThan0.presentation_definition, [blankCredential]);
      expect(bounds).toEqual([
        [
          {
            attributeName: 'credentialSubject.number',
            format: undefined,
            min: EPSILON_NUMBER,
            max: MAX_NUMBER,
            type: 'number',
          },
        ],
      ]);
    });

    test('getNumberLessThan', () => {
      const bounds = pexToBounds(getNumberLessThan.presentation_definition, [blankCredential]);
      expect(bounds).toEqual([
        [
          {
            attributeName: 'credentialSubject.number',
            format: undefined,
            min: MIN_NUMBER,
            max: 123123 - EPSILON_NUMBER,
            type: 'number',
          },
        ],
      ]);
    });

    test('getNumberRangeMutliPath', () => {
      const bounds = pexToBounds(getNumberRangeMutliPath.presentation_definition, [miscCredential]);
      expect(bounds).toEqual([
        [
          {
            attributeName: 'credentialSubject.number',
            format: undefined,
            min: EPSILON_NUMBER,
            max: 123123 - EPSILON_NUMBER,
            type: 'number',
          },
        ],
      ]);
    });

    test('getUniversityDegreeDateBetween', () => {
      const bounds = pexToBounds(getUniversityDegreeDateBetween.presentation_definition, [
        blankCredential,
      ]);
      expect(JSON.parse(JSON.stringify(bounds))).toEqual([
        [
          {
            attributeName: 'credentialSubject.dateEarned',
            format: 'date',
            min: '1999-01-01T00:00:00.000Z',
            max: MAXDATE_STR,
            type: 'string',
          },
          {
            attributeName: 'credentialSubject.dateEarned',
            format: 'date',
            min: MINDATE_STR,
            max: '2050-12-31T00:00:00.000Z',
            type: 'string',
          },
        ],
      ]);
    });

    test('getUniversityDegreeDateGreaterThan', () => {
      const bounds = pexToBounds(getUniversityDegreeDateGreaterThan.presentation_definition, [
        blankCredential,
      ]);
      expect(JSON.parse(JSON.stringify(bounds))).toEqual([
        [
          {
            attributeName: 'credentialSubject.dateEarned',
            format: 'date',
            min: '1999-01-01T00:00:00.000Z',
            max: MAXDATE_STR,
            type: 'string',
          },
        ],
      ]);
    });

    test('getUniversityDegreeDateRanged', () => {
      const bounds = pexToBounds(getUniversityDegreeDateRanged.presentation_definition, [
        blankCredential,
      ]);
      // The actual data has formatMinimum/formatMaximum that create specific date bounds
      // pexToBounds returns dates as ISO strings when using formatMinimum/formatMaximum
      expect(Array.isArray(bounds[0])).toBe(true);
      expect(bounds[0][0].attributeName).toBe('credentialSubject.dateEarned');
    });

    test('no path throws appropriate error', () => {
      expect(() =>
        pexToBounds(noPathPexV2.presentation_definition, [blankCredential])
      ).toThrowError('Missing or empty field "path" property, expected array or string');
    });

    test('throws for unsupported type/format combination', () => {
      const req = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.custom'],
                  filter: { type: 'custom-type', format: 'custom-format', minimum: 0 },
                },
              ],
            },
          },
        ],
      };
      expect(() => pexToBounds(req, [blankCredential])).toThrow(
        /Unsupported format custom-format and type custom-type/
      );
    });

    test('handles legacy embedded schema with data URI', () => {
      const credentialWithLegacySchema = {
        credentialSchema: {
          id:
            'data:application/json;charset=utf-8,' +
            encodeURIComponent(
              JSON.stringify({
                jsonSchema: {
                  properties: {
                    number: { type: 'integer', minimum: 5, maximum: 50 },
                  },
                },
              })
            ),
        },
        credentialSubject: { number: 25 },
      };
      const req = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.number'],
                  filter: { type: 'integer', exclusiveMinimum: 10, exclusiveMaximum: 100 },
                },
              ],
            },
          },
        ],
      };
      const bounds = pexToBounds(req, [credentialWithLegacySchema]);
      expect(bounds[0][0].min).toBe(10 + EPSILON_INT);
      expect(bounds[0][0].max).toBe(100 - EPSILON_INT);
    });
  });

  describe('exclusive bounds and edge cases', () => {
    it('handles exclusiveMaximum for numbers with epsilon subtraction', () => {
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.age'],
                  filter: {
                    type: 'number',
                    exclusiveMaximum: 100,
                  },
                },
              ],
            },
          },
        ],
      };
      const bounds = pexToBounds(pex, [blankCredential]);
      expect(bounds[0][0].max).toBeLessThan(100);
      expect(bounds[0][0].max).toBeCloseTo(100 - EPSILON_NUMBER);
    });

    it('handles exclusiveMinimum for numbers with epsilon addition', () => {
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.age'],
                  filter: {
                    type: 'number',
                    exclusiveMinimum: 0,
                  },
                },
              ],
            },
          },
        ],
      };
      const bounds = pexToBounds(pex, [blankCredential]);
      expect(bounds[0][0].min).toBeGreaterThan(0);
      expect(bounds[0][0].min).toBeCloseTo(0 + EPSILON_NUMBER);
    });

    it('handles exclusiveMaximum for integers with epsilon subtraction', () => {
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.age'],
                  filter: {
                    type: 'integer',
                    exclusiveMaximum: 100,
                  },
                },
              ],
            },
          },
        ],
      };
      const bounds = pexToBounds(pex, [blankCredential]);
      expect(bounds[0][0].max).toBe(100 - EPSILON_INT);
    });

    it('handles exclusiveMinimum for integers with epsilon addition', () => {
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.age'],
                  filter: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                  },
                },
              ],
            },
          },
        ],
      };
      const bounds = pexToBounds(pex, [blankCredential]);
      expect(bounds[0][0].min).toBe(0 + EPSILON_INT);
    });

    it('removeFromRequest=true prunes the field from request', () => {
      const req = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.number'],
                  filter: { type: 'number', minimum: 0, maximum: 10 },
                },
              ],
            },
          },
        ],
      };
      const fieldsRef = req.input_descriptors[0].constraints.fields;
      const bounds = pexToBounds(req, [blankCredential], true);
      expect(bounds[0][0]).toMatchObject({ attributeName: 'credentialSubject.number' });
      expect(fieldsRef.length).toBe(0);
    });

    it('handles exclusiveMaximum for numbers', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { age: { type: 'number', multipleOf: 0.5 } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [{ path: ['$.age'], filter: { exclusiveMaximum: 100 } }],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].max).toBeLessThan(100);
    });

    it('handles exclusiveMinimum for numbers', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { age: { type: 'number', multipleOf: 0.5 } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [{ path: ['$.age'], filter: { exclusiveMinimum: 10 } }],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].min).toBeGreaterThan(10);
    });

    it('handles exclusiveMaximum for integers', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { count: { type: 'integer' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [{ path: ['$.count'], filter: { exclusiveMaximum: 50 } }],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].max).toBe(49);
    });

    it('handles exclusiveMinimum for integers', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { count: { type: 'integer' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [{ path: ['$.count'], filter: { exclusiveMinimum: 5 } }],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].min).toBe(6);
    });

    it('handles formatMaximum for date-time', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { issuanceDate: { type: 'string', format: 'date-time' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.issuanceDate'],
                  filter: { formatMaximum: '2024-12-31T23:59:59Z', format: 'date-time' },
                },
              ],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].max).toBeInstanceOf(Date);
    });

    it('handles formatMinimum for date-time', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { issuanceDate: { type: 'string', format: 'date-time' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.issuanceDate'],
                  filter: { formatMinimum: '2020-01-01T00:00:00Z', format: 'date-time' },
                },
              ],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      expect(result[0][0].min).toBeInstanceOf(Date);
    });

    it('throws error for unsupported format types', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { unknown: { type: 'object' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [
                {
                  path: ['$.unknown'],
                  filter: { format: 'custom-format', type: 'object', maximum: 10 },
                },
              ],
            },
          },
        ],
      };
      expect(() => pexToBounds(pex, [cred], false)).toThrow(/Unsupported format/);
    });

    it('returns early when both max and min are undefined', async () => {
      const cred = {
        credentialSchema: {
          details: JSON.stringify({
            jsonSchema: {
              properties: { field: { type: 'string' } },
            },
          }),
        },
      };
      const pex = {
        input_descriptors: [
          {
            constraints: {
              fields: [{ path: ['$.field'], filter: { type: 'string' } }],
            },
          },
        ],
      };
      const result = pexToBounds(pex, [cred], false);
      // Should skip fields without bounds
      expect(result[0]).toEqual([]);
    });

    test('removeFromRequest parameter works correctly', () => {
      const inputDescriptor = {
        constraints: {
          fields: [
            {
              path: ['$.credentialSubject.number'],
              filter: {
                type: 'number',
                minimum: 0,
              },
            },
          ],
        },
      };
      const pex = {
        input_descriptors: [inputDescriptor],
      };

      const bounds = pexToBounds(pex, [blankCredential], true);
      expect(bounds).toBeDefined();
      expect(Array.isArray(bounds)).toBe(true);
    });
  });
});
