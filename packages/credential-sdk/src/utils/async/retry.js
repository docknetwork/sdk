import { timeout, withTimeout } from './timeout';

/**
 * Calls supplied function `fn` and waits for its completion up to `timeLimit`, retries in case timeout was fired.
 * Additionally, `delay` between retries, `maxAttempts` count, `onTimeoutExceeded` and `onError` can be specified.
 *
 * `onError` callback will be called once an error is encountered, and it can be
 * - resolved to some value, so the underlying promise will be resolved
 * - rejected, so then underlying promise will be rejected
 * - resolved to `CONTINUE_SYM` (second argument), so the retries will be continued
 *
 * @template T
 * @param {function(): Promise<T>} fn
 * @param {number} timeLimit
 * @param {object} [params={}]
 * @param {number} [params.delay=null]
 * @param {number} [params.maxAttempts=Infinity]
 * @param {function(CONTINUE_SYM): Promise<T | CONTINUE_SYM>} [params.onTimeoutExceeded=null]
 * @param {function(Error, CONTINUE_SYM): Promise<T | CONTINUE_SYM>} [params.onError=null]
 * @returns {Promise<T>}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default async function retry(
  fn,
  {
    maxAttempts = Infinity,
    timeLimit = null,
    delay = null,
    onTimeoutExceeded = null,
    onError = null,
  } = {},
) {
  const CONTINUE_SYM = Symbol('continue');

  for (let i = 0; i <= maxAttempts; i++) {
    let timeoutExceeded = false;
    let res;

    /* eslint-disable no-await-in-loop */
    try {
      res = await (timeLimit != null
        ? withTimeout(fn(), timeLimit, () => {
          timeoutExceeded = true;

          return CONTINUE_SYM;
        })
        : fn());
    } catch (error) {
      if (onError != null) {
        res = await onError(error, CONTINUE_SYM);
      } else {
        throw error;
      }
    }

    if (timeoutExceeded && onTimeoutExceeded != null) {
      res = await onTimeoutExceeded(CONTINUE_SYM);
    }
    if (res !== CONTINUE_SYM) {
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
}
/* eslint-enable sonarjs/cognitive-complexity */
