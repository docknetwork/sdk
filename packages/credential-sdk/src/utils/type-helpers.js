import {
  METHOD_REG_EXP_PATTERN,
  HEX_ID_REG_EXP_PATTERN,
} from '../resolver/generic/const';
import { isPrototypeOf } from './inheritance';
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
 * @returns {string}
 */
export function ensureString(value, ctx = '') {
  if (!isString(value)) {
    throw new Error(`${value} needs to be a string. ${ctx}`);
  }

  return String(value);
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

export function ensureArrayLike(value, errCtx = '') {
  if (
    Array.isArray(value)
    || value instanceof Uint8Array
    || value instanceof Uint16Array
    || value instanceof Uint32Array
    || value instanceof Buffer
  ) {
    return value;
  } else {
    throw new Error(`\`${value}\` needs to be an Array-like. ${errCtx}`);
  }
}

export function ensureIterable(value, errCtx = '') {
  if (typeof value?.[Symbol.iterator] !== 'function') {
    throw new Error(`${value} needs to be an iterable. ${errCtx}`);
  }

  return value;
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

export function ensureByte(byte) {
  if (typeof byte !== 'number') {
    throw new TypeError(
      `Expected number in range 0-255, received \`${byte}\` with type \`${typeof byte}\``,
    );
  }
  // eslint-disable-next-line no-bitwise
  if (!Number.isInteger(byte) || (byte & 0xff) !== byte) {
    throw new Error(`Value is out of range 0-255: \`${byte}\``);
  }

  return byte;
}

export const ensureBytes = (bytes) => (bytes instanceof Uint8Array
  ? bytes
  : [...ensureIterable(bytes)].map(ensureByte));

export const ensureUint8Array = (bytes) => {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error(
      `Expected instance of \`Uint8Array\`, received: \`${bytes}\``,
    );
  }

  return bytes;
};

export const isBytes = (bytes) => {
  try {
    ensureBytes(bytes);

    return true;
  } catch {
    return false;
  }
};

export const ensureInstanceOf = (value, klass) => {
  if (!(value instanceof klass)) {
    throw new Error(
      `Expected \`${value}\` to be an instance of \`${klass.name}\``,
    );
  }

  return value;
};

export const ensurePrototypeOf = (proto, value) => {
  if (!isPrototypeOf(proto, value)) {
    throw new Error(
      `Expected \`${proto.name}\` to be a prototype of \`${value}\``,
    );
  }

  return value;
};

const STATUS_LIST_ID_MATCHER = new RegExp(
  `^status-list2021:${METHOD_REG_EXP_PATTERN}:${HEX_ID_REG_EXP_PATTERN}$`,
);

const PRIVATE_STATUS_LIST_ID_MATCHER = new RegExp(
  `^private-status-list2021:${HEX_ID_REG_EXP_PATTERN}$`,
);

/**
 * Fail if the given string isn't a valid `StatusList2021Credential` id.
 * @param statusListId
 */
export function ensureStatusListId(statusListId) {
  ensureString(statusListId);
  if (!STATUS_LIST_ID_MATCHER.test(statusListId)) {
    throw new Error(
      `\`${statusListId}\` needs to be a valid \`StatusList2021Credential\` identifier.`,
    );
  }
}

/**
 * Fail if the given string isn't a valid `PrivateStatusList2021Credential` id.
 * @param statusListId
 */
export function ensurePrivateStatusListId(statusListId) {
  ensureString(statusListId);
  if (!PRIVATE_STATUS_LIST_ID_MATCHER.test(statusListId)) {
    throw new Error(
      `\`${statusListId}\` needs to be a valid \`PrivateStatusList2021Credential\` identifier.`,
    );
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
  const dateRegex = new RegExp(
    '^(\\d{4})-(0[1-9]|1[0-2])-'
      + '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):'
      + '([0-5][0-9]):([0-5][0-9]|60)'
      + '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):'
      + '([0-5][0-9]))$',
    'i',
  );

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

  return value;
}
