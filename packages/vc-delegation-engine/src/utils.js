import { MAY_CLAIM_ALIAS_KEYS } from "./constants.js";

export function firstArrayItem(array, errorMessage) {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error(errorMessage);
  }
  return array[0];
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

export function extractMayClaims(subject) {
  if (!subject || typeof subject !== 'object') {
    return [];
  }
  for (const key of MAY_CLAIM_ALIAS_KEYS) {
    if (subject[key] !== undefined) {
      const value = subject[key];
      return Array.isArray(value) ? value.map((item) => String(item)) : [String(value)];
    }
  }
  return [];
}
