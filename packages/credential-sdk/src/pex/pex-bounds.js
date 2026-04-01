import { JSONPath } from '@astronautlabs/jsonpath';
import base64url from 'base64url';

export const EPSILON_NUMBER = 0.001;
export const EPSILON_INT = 1;

export const MAX_DATE_PLACEHOLDER = 884541351600000;
export const MIN_DATE_PLACEHOLDER = -17592186044415;
export const MAX_INTEGER = 100 ** 9;
export const MIN_INTEGER = -4294967295;
export const MAX_NUMBER = 100 ** 5;
export const MIN_NUMBER = -4294967294;

function correctFieldPath(path) {
  return path.replace('$.', '');
}

function getNumDecimalPlaces(n) {
  const parts = n.toString().split('.');
  return parts.length > 1 && parts[1].length;
}

function toMaxDecimalPlaces(n, maxDecimalPlaces) {
  return +n.toFixed(maxDecimalPlaces);
}

const BOUND_KEYS = [
  'maximum',
  'minimum',
  'formatMaximum',
  'formatMinimum',
  'exclusiveMaximum',
  'exclusiveMinimum',
];

/* eslint-disable-next-line sonarjs/cognitive-complexity */
export function pexToBounds(
  pexRequest,
  selectedCredentials = [],
  removeFromRequest = false,
) {
  const descriptorBounds = [];
  const fieldsToRemove = [];
  const inputDescriptors = pexRequest?.input_descriptors || [];

  inputDescriptors.forEach((inputDescriptor, index) => {
    const selectedCredential = selectedCredentials[index];
    if (!selectedCredential) {
      descriptorBounds.push([]);
      return;
    }

    const decodedSchema = decodeCredentialSchema(selectedCredential);
    const bounds = [];
    const fields = inputDescriptor?.constraints?.fields || [];

    fields.forEach((field) => {
      const bound = computeFieldBounds({
        field,
        selectedCredential,
        decodedSchema,
        removeFromRequest,
        fieldsContainer: fields,
        fieldsToRemove,
      });

      if (bound) {
        bounds.push(bound);
      }
    });

    descriptorBounds.push(bounds);
  });

  fieldsToRemove.forEach(({ fields, field }) => {
    const idx = fields.indexOf(field);
    if (idx !== -1) {
      fields.splice(idx, 1);
    }
  });

  return descriptorBounds;
}

export function applyEnforceBounds({
  builder,
  presentationDefinition,
  provingKeyId,
  provingKey,
  selectedCredentials,
  credentialIdx,
}) {
  const descriptorBounds = pexToBounds(
    presentationDefinition,
    selectedCredentials,
  );

  let skipProvingKey = false;
  const result = [];
  const applyBounds = (items, builderIndex) => {
    items.forEach((bound) => {
      builder.enforceBounds(
        builderIndex,
        bound.attributeName,
        bound.min,
        bound.max,
        provingKeyId,
        skipProvingKey ? undefined : provingKey,
      );
      skipProvingKey = true;
    });
    result[builderIndex] = items;
  };

  if (typeof credentialIdx === 'number') {
    const items = descriptorBounds[0] || [];
    applyBounds(items, credentialIdx);
    return result;
  }

  descriptorBounds.forEach((items, builderIndex) => {
    applyBounds(items, builderIndex);
  });

  return result;
}

function decodeCredentialSchema(selectedCredential = {}) {
  const schemaStartStr = 'data:application/json;charset=utf-8,';
  const schema = selectedCredential.credentialSchema;
  if (!schema) {
    return {};
  }
  if (schema.details) {
    const parsed = JSON.parse(schema.details);
    return parsed.jsonSchema || {};
  }
  if (schema.id && schema.id.startsWith(schemaStartStr)) {
    return JSON.parse(
      decodeURIComponent(schema.id.split(schemaStartStr)[1]),
    );
  }
  return {};
}

function resolveAttributeName(field, credential) {
  if (Array.isArray(field.path) && field.path.length > 1) {
    for (const path of field.path) {
      const matches = JSONPath.paths(credential, path);
      if (matches.length) {
        return correctFieldPath(JSONPath.stringify(matches[0]));
      }
    }
    return null;
  }
  const [firstPath] = Array.isArray(field.path) ? field.path : [field.path];
  return correctFieldPath(firstPath);
}

function resolveAttributeSchema(attributeName, decodedSchema, fallbackType) {
  const schemaPath = `$.properties.${attributeName.replaceAll('.', '.properties.')}`;
  return JSONPath.query(decodedSchema, schemaPath, 1)[0] || { type: fallbackType };
}

function hasExplicitBounds(filter = {}) {
  return BOUND_KEYS.some((key) => filter[key] !== undefined);
}

function resolveBound({
  direct,
  formatValue,
  exclusiveValue,
  schemaValue,
  fallback,
  exclusiveAdjustment,
}) {
  if (direct !== undefined) {
    return direct;
  }
  if (formatValue !== undefined) {
    return formatValue;
  }
  if (exclusiveValue !== undefined) {
    return exclusiveAdjustment ? exclusiveAdjustment(exclusiveValue) : exclusiveValue;
  }
  if (schemaValue !== undefined) {
    return schemaValue;
  }
  return fallback;
}

function determineBounds({
  attributeType,
  format,
  attributeSchema = {},
  filter = {},
}) {
  if (!hasExplicitBounds(filter)) {
    return null;
  }

  if (format === 'date-time' || format === 'date') {
    const maxValue = resolveBound({
      direct: filter.maximum,
      formatValue: filter.formatMaximum,
      exclusiveValue: filter.exclusiveMaximum,
      schemaValue: attributeSchema.maximum,
      fallback: MAX_DATE_PLACEHOLDER,
    });
    const minValue = resolveBound({
      direct: filter.minimum,
      formatValue: filter.formatMinimum,
      exclusiveValue: filter.exclusiveMinimum,
      schemaValue: attributeSchema.minimum,
      fallback: MIN_DATE_PLACEHOLDER,
    });
    return {
      min: new Date(minValue),
      max: new Date(maxValue),
    };
  }

  if (attributeType === 'number') {
    const epsilon = attributeSchema.multipleOf || EPSILON_NUMBER;
    const decimalPlaces = getNumDecimalPlaces(epsilon);
    const maxValue = resolveBound({
      direct: filter.maximum,
      formatValue: filter.formatMaximum,
      exclusiveValue: filter.exclusiveMaximum,
      schemaValue: attributeSchema.maximum,
      fallback: MAX_NUMBER,
      exclusiveAdjustment: (value) => value - epsilon,
    });
    const minValue = resolveBound({
      direct: filter.minimum,
      formatValue: filter.formatMinimum,
      exclusiveValue: filter.exclusiveMinimum,
      schemaValue: attributeSchema.minimum,
      fallback: MIN_NUMBER,
      exclusiveAdjustment: (value) => value + epsilon,
    });
    return {
      min: toMaxDecimalPlaces(minValue, decimalPlaces),
      max: toMaxDecimalPlaces(maxValue, decimalPlaces),
    };
  }

  if (attributeType === 'integer') {
    const maxValue = resolveBound({
      direct: filter.maximum,
      formatValue: filter.formatMaximum,
      exclusiveValue: filter.exclusiveMaximum,
      schemaValue: attributeSchema.maximum,
      fallback: MAX_INTEGER,
      exclusiveAdjustment: (value) => value - EPSILON_INT,
    });
    const minValue = resolveBound({
      direct: filter.minimum,
      formatValue: filter.formatMinimum,
      exclusiveValue: filter.exclusiveMinimum,
      schemaValue: attributeSchema.minimum,
      fallback: MIN_INTEGER,
      exclusiveAdjustment: (value) => value + EPSILON_INT,
    });
    return {
      min: Math.floor(minValue),
      max: Math.floor(maxValue),
    };
  }

  throw new Error(
    `Unsupported format ${filter.format} and type ${attributeType} for enforce bounds`,
  );
}

function computeFieldBounds({
  field,
  selectedCredential,
  decodedSchema,
  removeFromRequest,
  fieldsContainer,
  fieldsToRemove,
}) {
  if (!field.path || field.path.length === 0) {
    throw new Error(
      'Missing or empty field "path" property, expected array or string',
    );
  }

  const attributeName = resolveAttributeName(field, selectedCredential);
  if (!attributeName) {
    return null;
  }

  const filter = field.filter || {};
  const attributeSchema = resolveAttributeSchema(
    attributeName,
    decodedSchema,
    filter.type,
  );
  const bounds = determineBounds({
    attributeType: attributeSchema.type || filter.type,
    format: filter.format,
    attributeSchema,
    filter,
  });

  if (!bounds) {
    return null;
  }

  if (removeFromRequest) {
    fieldsToRemove.push({
      fields: fieldsContainer,
      field,
    });
  }

  return {
    attributeName,
    min: bounds.min,
    max: bounds.max,
    format: filter.format,
    type: filter.type,
  };
}

const DATA_URL_PREFIX = 'data:application/octet-stream;base64,';

export function blobFromBase64(base64String) {
  const cleanedBase64 = base64String.replace(DATA_URL_PREFIX, '');
  return base64url.toBuffer(cleanedBase64);
}

export function isBase64OrDataUrl(str = '') {
  return (
    typeof str === 'string'
    && (str.startsWith(DATA_URL_PREFIX)
      || /^[0-9a-zA-Z+/]+={0,2}$/.test(str.replace(/[\r\n]/g, '')))
  );
}
