/**
 * Return true if a value is an object with Object constructor.
 * @param value
 * @returns {boolean}
 */
export function isObject(value) {
  return isObjectWithAnyConstructor(value) && value.constructor === Object;
}

/**
 * Return true if a value is an object.
 * @param value
 * @returns {boolean}
 */
export function isObjectWithAnyConstructor(value) {
  return value && typeof value === 'object';
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

  throw new TypeError(
    `${value} needs to be an object with Object constructor.`,
  );
}

/**
 * Ensures that the given value is an object. If not, throws an error explaining why.
 *
 * @template T
 * @param {T} value - The value to check.
 * @throws If value is not an object.
 * @returns {T}
 */
export function ensureObjectWithAnyConstructor(value) {
  if (isObjectWithAnyConstructor(value)) {
    return value;
  }

  throw new TypeError(`${value} needs to be an object.`);
}

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
 * Clones supplied object using `JSON.parse(JSON.stringify(...))`.
 *
 * @param {Object} obj
 * @returns {Object}
 */
export const deepClone = (obj) => JSON.parse(JSON.stringify(ensureObject(obj)));

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
