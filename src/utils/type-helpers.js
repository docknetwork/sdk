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
 * Fail if the given value isn't a string
 * @param value
 */
export function ensureString(value) {
  if (!isString(value)) {
    throw new Error(`${value} needs to be a string.`);
  }
}

/**
 * Fail if the given value isn't an object
 * @param value
 */
export function ensureObject(value) {
  if (!isObject(value)) {
    throw new Error(`${value} needs to be an object.`);
  }
}

/**
 * Fail if the given string isn't a URI
 * @param uri
 */
export function ensureURI(uri) {
  ensureString(uri);
  const pattern = new RegExp('^\\w+:\\/?\\/?[^\\s]+$');
  if (!pattern.test(uri)) {
    throw new Error(`${uri} needs to be a valid URI.`);
  }
}

/**
 * Fail if the given value isn't an object with the given key as property
 * @param {object} value - object to check
 * @param {string} name - Name of the object. Used in constructing error.
 * @param {string} key - Property to look for
 */
export function ensureObjectWithKey(value, key, name) {
  ensureObject(value);
  if (!(key in value)) {
    throw new Error(`"${name}" must include the '${key}' property.`);
  }
}

/**
 * Fail if the given value isn't an object with id property
 * @param value
 * @param {string} name - Name of the object. Used in constructing error.
 */
export function ensureObjectWithId(value, name) {
  ensureObjectWithKey(value, 'id', name);
}

/**
 * Fail if the given datetime isn't valid.
 * @param datetime
 */
export function ensureValidDatetime(datetime) {
  // Z and T can be lowercase
  // RFC3339 regex
  const dateRegex = new RegExp('^(\\d{4})-(0[1-9]|1[0-2])-'
      + '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):'
      + '([0-5][0-9]):([0-5][0-9]|60)'
      + '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):'
      + '([0-5][0-9]))$', 'i');

  if (!dateRegex.test(datetime)) {
    throw new Error(`${datetime} needs to be a valid datetime.`);
  }

  return true;
}

/**
 * Fail if the given value isn't an array
 * @param value
 */
export function ensureArray(value) {
  if (!Array.isArray(value)) {
    throw new Error('The value provided must be an array');
  }
}
