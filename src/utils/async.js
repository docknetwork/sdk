/* eslint-disable max-classes-per-file */
import { MapWithCapacity } from './generic';

/**
 * A promise that can be reused.
 */
export class ReusablePromise {
  /**
   *
   * @param {object} configuration
   * @param {boolean} [configuration.save=false] - if set to `true`, stores the result of the first successful promise forever.
   */
  constructor({ save = false } = {}) {
    this.promise = null;
    this.save = save;
  }

  /**
   * Checks if a promise exists, if so, `await`s it, otherwise inserts a new `Promise` produced by
   * calling `createPromise` function.
   *
   * @template T
   * @param {function(): Promise<T>} createPromise
   * @returns {Promise<T>}
   */
  async call(createPromise) {
    if (this.promise != null) {
      return this.promise;
    }
    this.promise = createPromise();

    let res;
    let err;
    try {
      res = await this.promise;
    } catch (e) {
      err = e;
    } finally {
      if (!this.save || err != null) {
        this.clear();
      }
    }

    if (err != null) {
      throw err;
    }
    return res;
  }

  clear() {
    this.promise = null;
  }
}

/**
 * A map where each entry represents a keyed promise that can be reused.
 */
export class ReusablePromiseMap {
  /**
   *
   * @param {object} configuration
   * @param {boolean} [configuration.save=false] - if set to `true`, stores the result of the first successful promise for each key.
   * @param {?number} [configuration.capacity] - max capacity of the underlying container.
   */
  constructor({ capacity, save = false } = {}) {
    this.map = capacity != null ? new MapWithCapacity(capacity) : new Map();
    this.save = save;
  }

  /**
   * Checks if a promise with the supplied key exists, if so, `await`s it, otherwise inserts a new `Promise` produced by
   * calling `createPromise` function.
   *
   * @template T
   * @param {*} key
   * @param {function(): Promise<T>} createPromise
   * @returns {Promise<T>}
   */
  async callByKey(key, createPromise) {
    let res;
    if (!this.map.has(key)) {
      const promise = createPromise();
      this.map.set(key, promise);

      let err;
      try {
        res = await promise;
      } catch (e) {
        err = e;
      } finally {
        if (!this.save || err != null) {
          this.map.delete(key);
        }
      }

      if (err != null) {
        throw err;
      }
    } else {
      res = await this.map.get(key);
    }

    return res;
  }

  clear() {
    this.map.clear();
  }
}

/**
 * Creates a promise that will call the optional supplied function `f` and return its result after `time` passes.
 * If no function is provided, the promise will be resolved to `undefined`.
 *
 * @template T
 * @param {number} time
 * @param {function(): Promise<T>} f
 * @returns {Promise<T>}
 */
export const timeout = async (time, f = () => {}) => await new Promise((resolve, reject) => setTimeout(async () => {
  try {
    resolve(await f());
  } catch (err) {
    reject(err);
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

/**
 * Calls supplied function `fn` and waits for its completion up to `timeLimit`, retries in case timeout was fired.
 * Additionally, `delay` between retries, `maxAttempts` count, `onTimeoutExceeded` and `onError` can be specified.
 *
 * `onError` callback will be called once an error is encountered, and it can be
 * - resolved to some value, so the underlying promise will be resolved
 * - rejected, so then underlying promise will be rejected
 * - resolved to `RETRY_SYM` (second argument), so the retries will be continued
 *
 * @template T
 * @param {function(): Promise<T>} fn
 * @param {number} timeLimit
 * @param {object} [params={}]
 * @param {number} [params.delay=null]
 * @param {number} [params.maxAttempts=Infinity]
 * @param {function(RETRY_SYM): Promise<T | RETRY_SYM>} [params.onTimeoutExceeded=null]
 * @param {function(Error, RETRY_SYM): Promise<T | RETRY_SYM>} [params.onError=null]
 * @returns {Promise<T>}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export const retry = async (
  fn,
  timeLimit,
  {
    delay = null,
    maxAttempts = Infinity,
    onTimeoutExceeded = null,
    onError = null,
  } = {},
) => {
  const RETRY_SYM = Symbol('retry');

  for (let i = 0; i <= maxAttempts; i++) {
    let timeoutExceeded = false;
    const timerFn = () => {
      timeoutExceeded = true;

      return RETRY_SYM;
    };

    let res;
    /* eslint-disable no-await-in-loop */
    if (onError != null) {
      try {
        res = await withTimeout(fn(), timeLimit, timerFn);
      } catch (error) {
        res = await onError(error, RETRY_SYM);
      }
    } else {
      res = await withTimeout(fn(), timeLimit, timerFn);
    }

    if (timeoutExceeded && onTimeoutExceeded != null) {
      res = await onTimeoutExceeded(RETRY_SYM);
    }
    if (res !== RETRY_SYM) {
      return res;
    } else if (delay != null) {
      await timeout(delay);
    }
    /* eslint-enable no-await-in-loop */
  }

  throw new Error(
    `Promise created by \`${fn}\` didn't resolve within the specified timeout of ${timeLimit} ms ${
      maxAttempts + 1
    } times`,
  );
};
/* eslint-enable sonarjs/cognitive-complexity */
