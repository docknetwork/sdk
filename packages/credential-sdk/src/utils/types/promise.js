/**
 * Return true if the given value is a an instance of `Promise`.
 * @param value
 * @returns {boolean}
 */
export function isPromise(value) {
  return value instanceof Promise;
}

/**
 * Ensures that the given value is a Promise. Throws an error with an optional context message if not.
 * @param {any} value - The value to check.
 * @param {string} [message] - Optional message for the error.
 * @returns {Promise} - The original promise value.
 */
export function ensurePromise(value) {
  if (isPromise(value)) {
    return value;
  }

  throw new TypeError(`\`${value}\` needs to be a Promise.`);
}
