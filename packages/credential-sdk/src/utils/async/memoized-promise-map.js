import { MapWithCapacity } from '../types';

/**
 * A map where each entry represents a keyed promise that can be reused.
 * While the underlying map capacity is reached, every new call will be put in the queue
 * that will be processed every time one of the promises is fulfilled.
 */
export default class MemoizedPromiseMap {
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
   * Checks if a promise with the supplied key exists, if so, `await`s it, otherwise sets a new `Promise` produced by
   * calling `createPromise` function.
   *
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
        throw new Error("`MemoizedPromiseMap`'s queue reached its capacity");
      }
      // We have no remaining places in the map, thus the promise can't be executed at the moment and will be queued.
      await new Promise((resolve, reject) => this.queue.push({ resolve, reject }));

      if (this.map.has(key)) {
        this.shiftQueuedItems(1);

        return await this.map.get(key);
      }
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

      if (hasQueued || !this.save || err != null) {
        const deleted = this.map.get(key) === promise && this.map.delete(key);

        if (deleted) {
          this.shiftQueuedItems(1);
        }
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

    this.shiftQueuedItems(Infinity, ({ reject }) => reject(new Error('`MemoizedPromiseMap` was cleared')));
  }

  /**
   * Shifts up to `limit` items from the queue applying the supplied function to each.
   *
   * @param {number} limit
   * @param {function({ resolve: Function, reject: Function }): void} [f=({ resolve, reject: _ }) => resolve()]
   */
  shiftQueuedItems(limit, f = ({ resolve, reject: _ }) => resolve()) {
    let remaining = limit;

    while (this.queue.length && remaining-- > 0) {
      f(this.queue.shift());
    }
  }
}
