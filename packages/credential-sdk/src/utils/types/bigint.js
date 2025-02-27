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
