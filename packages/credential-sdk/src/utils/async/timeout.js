/**
 * Creates a promise that will call the optional supplied function `f` and return its result after `time` passes.
 * If no function is provided, the promise will be resolved to `undefined`.
 *
 * @template T
 * @param {number} time
 * @param {function(): Promise<T>} f
 * @returns {Promise<T>}
 */
export const timeout = async (time, f = async () => {}) => await new Promise((resolve, reject) => setTimeout(async () => {
  try {
    resolve(await f());
  } catch (error) {
    reject(error);
  }
}, time));

/**
 * Combines supplied `promise` with a `timeout` that will call supplied `f` after `time` passes.
 * Resolves to the earliest produced value.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} time
 * @param {function(): Promise<T>} [f=()=>{throw new Error("Timeout exceeded")}]
 * @returns {Promise<T>}
 */
export const withTimeout = async (
  promise,
  time,
  f = () => {
    throw new Error('Timeout exceeded');
  },
) => await Promise.race([promise, timeout(time, f)]);
