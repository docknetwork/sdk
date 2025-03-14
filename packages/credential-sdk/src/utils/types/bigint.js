/**
 * Return true if the given value is a BigInt.
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a BigInt, false otherwise
 */
export function isBigInt(value) {
  return typeof value === 'bigint';
}

/**
 * Ensures that the given value is a BigInt. If not, throws an error.
 *
 * @param {*} value - The value to check.
 * @returns {BigInt} - The value as a BigInt.
 */
export function ensureBigInt(value) {
  if (isBigInt(value)) {
    return value;
  }

  throw new TypeError(`${value} needs to be a BigInt`);
}

/**
 * Returns the minimum value from a list of BigInt values.
 *
 * @param {...BigInt} bigints - One or more BigInt values to compare
 * @returns {BigInt|null} The smallest BigInt from the provided values, or null if no values are provided
 *
 * @example
 * // Returns 1n
 * minBigInt(1n, 2n, 3n);
 *
 * @example
 * // Returns -10n
 * minBigInt(5n, 0n, -10n, 100n);
 *
 * @example
 * // Returns null
 * minBigInt();
 */
export const minBigInt = (...bigints) => bigints.reduce((min, cur) => (min == null || cur < min ? cur : min), null);

/**
 * Returns the maximum value from a list of BigInt values.
 *
 * @param {...BigInt} bigints - One or more BigInt values to compare
 * @returns {BigInt|null} The smallest BigInt from the provided values, or null if no values are provided
 *
 * @example
 * // Returns 3n
 * minBigInt(1n, 2n, 3n);
 *
 * @example
 * // Returns -100n
 * minBigInt(5n, 0n, -10n, 100n);
 *
 * @example
 * // Returns null
 * minBigInt();
 */
export const maxBigInt = (...bigints) => bigints.reduce((max, cur) => (max == null || cur > max ? cur : max), null);
