/**
 * Return true if the given value is a number.
 * @param value
 * @returns {boolean}
 */
export function isNumber(value) {
  return (
    (typeof value === 'number' && !Number.isNaN(value))
    || value instanceof Number
  );
}

/**
 * Ensures that the given value is a number. Throws an error with an optional context message if not.
 * @param {any} value - The value to check.
 * @param {string} [message] - Optional message for the error.
 * @returns {number} - The value converted to a number.
 */
export function ensureNumber(value) {
  if (isNumber(value)) {
    return Number(value);
  }

  throw new TypeError(`\`${value}\` needs to be a number.`);
}
