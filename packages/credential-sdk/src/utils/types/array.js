import { withoutPrototypeFunctions } from '../inheritance';

/**
 * Return true if the given value is an array.
 * @param value
 * @returns {boolean}
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * Ensures that the given value is an array. Throws an error stating it must be an array if not.
 *
 * @param {*} value - The value to check.
 * @returns {Array} - The original array value.
 */
export function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  throw new TypeError('The provided value must be Array');
}

/**
 * Ensures that the given value is array-like (an Array, Uint8Array, Uint16Array, Uint32Array, or Buffer).
 * If not, throws an error indicating it must be array-like.
 *
 * @param {*} value - The value to check.
 * @throws If value is not an instance of `Array|Uint8Array|Uint16Array|Uint32Array|Buffer`
 * @returns {Array|Uint8Array|Uint16Array|Uint32Array|Buffer} - The original value if valid.
 */
export function ensureArrayLike(value) {
  if (
    Array.isArray(value)
    || value instanceof Uint8Array
    || value instanceof Uint16Array
    || value instanceof Uint32Array
    || value instanceof Buffer
  ) {
    return value;
  }

  throw new TypeError('Value needs to be an Array-like');
}

/**
 * Get unique elements from an array based on the mapItem function.
 * @param {Array} array - Array to check for duplicates.
 * @param {Function} mapItem - Function to map elements before comparison.
 * @returns {Array} - Array with unique elements.
 */
export function getUniqueElementsFromArray(array, mapItem) {
  const seen = new Set();

  return array.filter((item) => {
    const key = mapItem(item);

    return seen.has(key) ? false : seen.add(key);
  });
}

/**
 * Splits array into chunks of the given size.
 *
 * @template T
 * @param {Array<T>} arr
 * @param {number} chunkSize
 * @returns {Array<Array<T>>}
 */
export const chunks = (arr, chunkSize) => arr.reduce((acc, item, idx) => {
  if (idx % chunkSize === 0) acc.push([item]);
  else acc[acc.length - 1].push(item);

  return acc;
}, []);

/**
 * Class extending `Array` with all prototype methods set to `undefined`.
 */
export class ArrayWithoutPrototypeMethods extends withoutPrototypeFunctions(
  Array,
  new Set([
    'forEach',
    'filter',
    'every',
    'find',
    'findIndex',
    'splice',
    'some',
    'find',
  ]),
) {}
