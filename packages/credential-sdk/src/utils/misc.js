/* eslint-disable max-classes-per-file */
import { PatternMatcher } from './generic';
import { METHOD_REG_EXP_PATTERN } from '../resolver/generic/const';
import { ensureString } from './type-helpers';

// deep copy a json serializable object
export function deepClone(obj) {
  // https://jsben.ch/E55IQ
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get unique elements from an array as seen by the filterCallback function.
 * @param {array} a - Array to check for duplicates.
 * @param {function} filterCallback - Elements will be fed to this function before comparison.
 * @returns {*}
 */
export function getUniqueElementsFromArray(a, filterCallback) {
  const seen = new Set();
  return a.filter((item) => {
    const k = filterCallback(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

const ID_CHAR = '[a-zA-Z0-9_.-]';
const METHOD_ID = `(${ID_CHAR}+(:${ID_CHAR}+)*)`;
const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';
const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;
const PARAMS = `((${PARAM})*)`;
// eslint-disable-next-line no-useless-escape
const PATH = '(/[^#?]*)?';
const QUERY = '([?][^#]*)?';
// eslint-disable-next-line no-useless-escape
const FRAGMENT = '(#.*)?';
const DID_MATCHER = new RegExp(
  `^did:${METHOD_REG_EXP_PATTERN}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`,
);

/**
 * Parses supplied DID URL.
 * @param {string} didUrl
 * @returns {object}
 */
export function parseDIDUrl(didUrl) {
  if (didUrl === '' || !didUrl) throw new Error('Missing DID');
  const sections = ensureString(didUrl).match(DID_MATCHER);
  if (sections) {
    const parts = {
      did: `did:${sections[1]}:${sections[2]}`,
      method: sections[1],
      id: sections[2],
      didUrl,
    };
    if (sections[4]) {
      const params = sections[4].slice(1).split(';');
      parts.params = {};
      for (const p of params) {
        const kv = p.split('=');

        // eslint-disable-next-line prefer-destructuring
        parts.params[kv[0]] = kv[1];
      }
    }
    // eslint-disable-next-line prefer-destructuring
    if (sections[6]) parts.path = sections[6];
    if (sections[7]) parts.query = sections[7].slice(1);
    if (sections[8]) parts.fragment = sections[8].slice(1);
    return parts;
  }
  throw new Error(`Invalid DID: \`${didUrl}\``);
}

/**
 * Filters properties of the object according to the supplied `filter`.
 *
 * @template K
 * @template V
 * @param {Object<K, V>} obj
 * @param {function(K, V): boolean} filter
 * @returns {Object<K, V>}
 */
export const filterObj = (obj, filter) => {
  const res = Object.create(Object.getPrototypeOf(obj));
  for (const [key, value] of Object.entries(obj)) {
    if (filter(key, value)) {
      res[key] = value;
    }
  }

  return res;
};

/**
 * Maps properties of the object according to the supplied `map`.
 *
 * @template K
 * @template VI
 * @template VO
 * @param {Object<K, VI>} obj
 * @param {function(VI): VO} map
 * @returns {Object<K, VO>}
 */
export const mapObj = (obj, map) => {
  const res = Object.create(Object.getPrototypeOf(obj));
  for (const [key, value] of Object.entries(obj)) {
    res[key] = map(value);
  }

  return res;
};

/**
 * Sets prototype of the supplied object to `null`, returns the object.
 * @template T
 * @param {T}
 * @returns {T}
 */
export const extendNull = (obj) => Object.setPrototypeOf(obj, null);

/**
 * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
 *
 * @param pattern
 * @param value
 */
export const ensureMatchesPattern = (pattern, value) => new PatternMatcher().check(pattern, value);

/**
 * Get a list of numbers in the range [start, stop], i.e. both are inclusive. Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
 * @param start
 * @param stop
 * @param step
 * @returns {number[]}
 */
export const inclusiveRange = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
