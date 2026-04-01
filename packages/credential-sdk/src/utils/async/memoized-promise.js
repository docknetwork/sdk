/**
 * A promise that can be reused.
 */
export default class MemoizedPromise {
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
   * Checks if a promise exists, if so, `await`s it, otherwise sets a new `Promise` produced by
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
