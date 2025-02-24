import {
  isIterable,
  isMap,
  isNumber,
  isObject,
  isPromise,
  isSet,
  isString,
} from './is-type';

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

/**
 * Ensures that the given value is an object. If not, throws an error explaining why.
 *
 * @template T
 * @param {T} value - The value to check.
 * @throws If value is not an object.
 * @returns {T}
 */
export function ensureObject(value) {
  if (isObject(value)) {
    return value;
  }

  throw new TypeError(`${value} needs to be an object.`);
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

  throw new TypeError(`\`${value}\` needs to be an Array-like`);
}

/**
 * Ensures that the given value is iterable. Throws an error with an optional context message if not.
 *
 * @param {*} value - The value to check for iterability.
 * @throws If value is not an iterable.
 * @returns {Iterable} - The original iterable value.
 */
export function ensureIterable(value) {
  if (isIterable(value)) {
    return value;
  }

  throw new TypeError(`${value} needs to be an iterable.`);
}

/**
 * Ensures that the given value is an instance of Uint8Array. Throws an error if not.
 *
 * @param {*} bytes - The value to check.
 * @throws If value is not a Uint8Array.
 * @returns {Uint8Array} - The original Uint8Array value.
 */
export const ensureUint8Array = (bytes) => {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  throw new TypeError(
    `Expected instance of \`Uint8Array\`, received: \`${bytes}\``,
  );
};

/**
 * Ensures that the given object has a specific key as a property. Throws an error with a message if not.
 *
 * @param {object} value - The object to check.
 * @param {string} key - The required property to look for.
 * @param {string} name - Name of the object used in constructing the error message.
 * @returns {object} - The original object if it contains the specified key.
 */
export function ensureObjectWithKey(value, key, name) {
  if (key in ensureObject(value)) {
    return value;
  }

  throw new Error(`"${name}" must include the '${key}' property.`);
}

/**
 * Ensures that the given object has an 'id' property. Throws an error with a message if not.
 *
 * @param {object} value - The object to check.
 * @param {string} name - Name of the object used in constructing the error message.
 * @returns {object} - The original object if it contains the 'id' property.
 */
export function ensureObjectWithId(value, name) {
  return ensureObjectWithKey(value, 'id', name);
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

  throw new TypeError('The value provided must be an array');
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

/**
 * Ensures that the given value is a Map. Throws an error with an optional context message if not.
 * @param {any} value - The value to check.
 * @param {string} [message] - Optional message for the error.
 * @returns {Map} - The value if it's a Map.
 */
export function ensureMap(value) {
  if (isMap(value)) {
    return value;
  }

  throw new TypeError(`\`${value}\` needs to be a Map.`);
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
