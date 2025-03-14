import { isObject } from './object';

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
 * Returns string containing comma-separated items of the provided iterable.
 *
 * @template V
 * @param {Iterable<V>} iter
 * @returns {string}
 */
export const fmtIterable = (iter) => `[${[...ensureIterable(iter)].map(String).join(', ')}]`;

/**
 * Converts the provided value into an iterable. If the value is already iterable,
 * it's returned as-is. If it's an object (not null), it returns an array of its
 * key-value pairs. Otherwise, it throws an error.
 *
 * @template T - The type of the input value
 * @param {T} value - The value to convert into an iterable
 * @returns {Iterable<T>} - An iterable version of the input value
 * @throws {Error} If the value is null, undefined, or neither an iterable nor an object
 */
export const toIterable = (value) => {
  if (isIterable(value)) {
    return value;
  } else if (isObject(value) && value != null) {
    return Object.entries(value);
  }

  throw new Error(`\`${value}\` is not an iterable or object`);
};

/**
 * Converts the provided value into an iterator. If the value is already iterable,
 * it's returned as-is. If it's an object (not null), it returns an array of its
 * key-value pairs. Otherwise, it throws an error.
 *
 * @template T - The type of the input value
 * @param {T} value - The value to convert into an iterator
 * @returns {IterableIterator<T>} - An iterator version of the input value
 * @throws {Error} If the value is null, undefined, or neither an iterable nor an object
 */
export const toIterator = (value) => toIterable(value)[Symbol.iterator]();
