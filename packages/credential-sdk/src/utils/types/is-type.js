/**
 * Return true if the given value is a BigInt.
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a BigInt, false otherwise
 */
export function isBigInt(value) {
  return typeof value === 'bigint';
}

/**
 * Return true if the given value is a string.
 * @param value
 * @returns {boolean}
 */
export function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

/**
 * Return true if a value is an object
 * @param value
 * @returns {boolean}
 */
export function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

/**
 * Return true if the given value is an array.
 * @param value
 * @returns {boolean}
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * Return true if a value is iterable.
 * @param value
 * @returns {boolean}
 */
export function isIterable(value) {
  // Check if it's an object and has Symbol.iterator property
  return (
    value != null
    && (typeof value === 'object' || typeof value === 'function')
    && Symbol.iterator in Object(value)
  );
}

/**
 * Return true if the given value is a Map.
 * @param value
 * @returns {boolean}
 */
export function isMap(value) {
  return value instanceof Map;
}

/**
 * Return true if the given value is a Set.
 * @param value
 * @returns {boolean}
 */
export function isSet(value) {
  return value instanceof Set;
}

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
 * Return true if the given value is a an instance of `Promise`.
 * @param value
 * @returns {boolean}
 */
export function isPromise(value) {
  return value instanceof Promise;
}
