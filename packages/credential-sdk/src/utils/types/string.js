/**
 * Return true if the given value is a string.
 * @param value
 * @returns {boolean}
 */
export function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

/**
 * Ensures that the given value is a string. If not, throws an error with an optional context message.
 *
 * @param {*} value - The value to check.
 * @returns {string} - The value converted to a string.
 */
export function ensureString(value) {
  if (isString(value)) {
    return String(value);
  }

  throw new TypeError(`${value} needs to be a string`);
}
