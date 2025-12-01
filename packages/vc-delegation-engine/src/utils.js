import { JSONPath } from 'jsonpath-plus';
import { MAY_CLAIM_ALIAS_KEYS } from './constants.js';

const JSON_PATH_PREFIX = '$';

function isJsonPathExpression(value) {
  return typeof value === 'string' && value.trim().startsWith(JSON_PATH_PREFIX);
}

function normalizeJsonPath(pathExpression) {
  if (typeof pathExpression !== 'string' || pathExpression.length === 0) {
    return String(pathExpression ?? '');
  }
  try {
    const pathArray = JSONPath.toPathArray(pathExpression);
    if (!Array.isArray(pathArray) || pathArray.length === 0) {
      return pathExpression.replace(/^\$\.?/, '');
    }
    const segments = pathArray.slice(1);
    return segments.reduce((acc, segment) => {
      const segmentString = typeof segment === 'number' ? `[${segment}]` : String(segment);
      if (!acc) {
        return segmentString;
      }
      return segmentString.startsWith('[') ? `${acc}${segmentString}` : `${acc}.${segmentString}`;
    }, '');
  } catch (error) {
    return pathExpression.replace(/^\$\.?/, '');
  }
}

function expandJsonPathClaim(expression, subject) {
  try {
    const matches = JSONPath({
      path: expression,
      json: subject,
      resultType: 'all',
    });
    if (!Array.isArray(matches) || matches.length === 0) {
      return [normalizeJsonPath(expression)];
    }
    return matches.map((match) => normalizeJsonPath(match.path));
  } catch (error) {
    return [normalizeJsonPath(expression)];
  }
}

function buildPath(parentPath, segment) {
  if (!parentPath) {
    return segment;
  }
  if (segment.startsWith('[')) {
    return `${parentPath}${segment}`;
  }
  return `${parentPath}.${segment}`;
}

function collectEntriesFromNode(node, parentPath, accumulator) {
  if (!node || typeof node !== 'object') {
    return;
  }
  Object.entries(node).forEach(([key, value]) => {
    if ((!parentPath && key === 'id') || MAY_CLAIM_ALIAS_KEYS.includes(key)) {
      return;
    }
    const nextPath = buildPath(parentPath, key);
    accumulator.push([nextPath, value]);

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrayPath = buildPath(nextPath, `[${index}]`);
        accumulator.push([arrayPath, item]);
        if (item && typeof item === 'object') {
          collectEntriesFromNode(item, arrayPath, accumulator);
        }
      });
    } else if (value && typeof value === 'object') {
      collectEntriesFromNode(value, nextPath, accumulator);
    }
  });
}

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
      const entries = Array.isArray(value) ? value : [value];
      const expanded = entries.flatMap((item) => {
        const claim = String(item);
        if (isJsonPathExpression(claim)) {
          return expandJsonPathClaim(claim, subject);
        }
        return [claim];
      });
      return [...new Set(expanded)];
    }
  }
  return [];
}

export function collectSubjectClaimEntries(subject) {
  if (!subject || typeof subject !== 'object') {
    return [];
  }
  const entries = [];
  collectEntriesFromNode(subject, '', entries);
  return entries;
}
