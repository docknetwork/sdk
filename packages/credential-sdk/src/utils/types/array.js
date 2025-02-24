import { withoutPrototypeFunctions } from '../inheritance';

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
