/**
 * Return true if the given value is a Set.
 * @param value
 * @returns {boolean}
 */
export function isSet(value) {
  return value instanceof Set;
}

/**
 * Ensures that the given value is a Set. Throws an error with an optional context message if not.
 * @param {any} value - The value to check.
 * @param {string} [message] - Optional message for the error.
 * @returns {Set} - The value if it's a Set.
 */
export function ensureSet(value) {
  if (isSet(value)) {
    return value;
  }

  throw new TypeError(`\`${value}\` needs to be a Set.`);
}

/**
 * Ensures that there is no intersection between two sets
 * @param {Set} set1 - The first set to compare
 * @param {Set} set2 - The second set to compare
 * @throws {Error} - If there is an intersection between set1 and set2
 */
export const ensureNoIntersection = (set1, set2) => {
  const [min, max] = [set1, set2]
    .map(ensureSet)
    .sort((a, b) => a.size - b.size);

  for (const item of min) {
    if (max.has(item)) {
      throw new Error(`Item \`${item}\` exists in both sets`);
    }
  }
};
