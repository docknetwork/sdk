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
      return await this.promise;
    }
    const promise = createPromise();
    this.promise = promise;

    let res;
    let err;
    try {
      res = await this.promise;
    } catch (e) {
      err = e;
    } finally {
      if ((!this.save || err != null) && this.promise === promise) {
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
   * @param {?number} [configuration.queueCapacity] - max capacity of the queue.
   */
  constructor({ capacity, queueCapacity, save = false } = {}) {
    this.map = capacity != null ? new MapWithCapacity(capacity) : new Map();
    this.queue = [];
    this.queueCapacity = queueCapacity;
    this.save = save;
  }

  /**
   * Checks if a promise with the supplied key exists, if so, `await`s it, otherwise inserts a new `Promise` produced by
   * calling `createPromise` function.
   * In case capacity is reached, the current call will be paused until the next promise(s) is resolved.
   *
   * @template T
   * @param {*} key
   * @param {function(): Promise<T>} createPromise
   * @returns {Promise<T>}
   */
  async callByKey(key, createPromise) {
    if (this.map.has(key)) {
      return await this.map.get(key);
    }

    if (this.reachedCapacity()) {
      if (this.queue.length === this.queueCapacity) {
        throw new Error('`ReusablePromiseMap`\'s queue reached its capacity');
      }
      await new Promise((resolve, reject) => this.queue.push({ resolve, reject }));
    }

    const promise = createPromise();
    this.map.set(key, promise);

    let res;
    let err;
    try {
      res = await promise;
    } catch (e) {
      err = e;
    } finally {
      const hasQueued = Boolean(this.queue.length);
      let deleted = false;

      if (hasQueued || !this.save || err != null) {
        deleted = this.map.get(key) === promise && this.map.delete(key);
      }

      if (hasQueued && deleted) {
        this.queue.shift().resolve();
      }
    }

    if (err != null) {
      throw err;
    }

    return res;
  }

  /**
   * Returns `true` if capacity is reached.
   *
   * @returns {boolean}
   */
  reachedCapacity() {
    return 'capacity' in this.map && this.map.size === this.map.capacity;
  }

  /**
   * Clears the underlying `Promise` map and `reject`s all queued items.
   */
  clear() {
    this.map.clear();

    while (this.queue.length) {
      this.queue.shift().reject(new Error('`ReusablePromiseMap` was cleared'));
    }
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
