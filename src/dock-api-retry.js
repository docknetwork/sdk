import { createSubmittable } from '@polkadot/api/submittable';
import { SubmittableResult } from '@polkadot/api/cjs/submittable/Result';
import { filterEvents } from '@polkadot/api/util';
import { retry } from './utils/misc';
import { ensureExtrinsicSucceeded, findExtrinsicBlock } from './utils/extrinsic';

const STANDARD_BLOCK_TIME = 3e3;
const FASTBLOCK_TIME = 500;

const STANDARD_CONFIG = {
  FINALIZED_TIMEOUT: 12e3,
  IN_BLOCK_TIMEOUT: 6e3,
  DELAY: STANDARD_BLOCK_TIME,
  FETCH_BLOCKS_COUNT: 10,
  MAX_ATTEMPTS: 2,
};

const FASTBLOCK_CONFIG = {
  FINALIZED_TIMEOUT: 6e3,
  IN_BLOCK_TIMEOUT: 3e3,
  DELAY: STANDARD_BLOCK_TIME,
  FETCH_BLOCKS_COUNT: 25,
  MAX_ATTEMPTS: 3,
};

/**
 * Properties that won't be patched/visited during the patching.
 */
const BlacklistedProperties = new Set([
  'meta',
  'registry',
  'toJSON',
  'is',
  'creator',
  'hash',
  'key',
  'keyPrefix',
]);

/**
 * Recursively patches supplied object property and all underlying objects, so all functions will attempt to retry 2 times and
 * will throw an error if there's no result within the `8 seconds` timeout.
 *
 * @param {*} obj
 * @param {*} prop
 * @param {string[]} [path=[]]
 */
const wrapFnWithRetries = (obj, prop, path = []) => {
  const value = obj[prop];
  if (
    BlacklistedProperties.has(prop)
    || !value
    || (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return;
  }

  try {
    let newValue;
    if (typeof value !== 'function') {
      newValue = Object.create(Object.getPrototypeOf(value));
    } else {
      newValue = async function with8SecsTimeoutAnd2Retries(...args) {
        const wrappedFn = () => value.apply(this, args);
        wrappedFn.toString = () => value.toString();

        return await retry(wrappedFn, 8e3, {
          maxAttempts: 2,
          delay: 5e2,
          onTimeoutExceeded: (retrySym) => {
            console.error(`\`${path.concat('.')}\` exceeded timeout`);

            return retrySym;
          },
        });
      };

      Object.setPrototypeOf(newValue, Object.getPrototypeOf(value));
    }

    for (const key of Object.keys(value)) {
      newValue[key] = value[key]; // eslint-disable-line no-param-reassign
      wrapFnWithRetries(newValue, key, path.concat(key));
    }

    // eslint-disable-next-line no-param-reassign
    delete obj[prop];
    Object.defineProperty(obj, prop, {
      value: newValue,
    });
  } catch (err) {
    console.error(
      `Failed to wrap the prop \`${prop}\` of \`${obj}\`: \`${
        err.message || err
      }\``,
    );
  }
};

/**
 * Patches the query API methods, so they will throw an error if there's no result within the `8 seconds` timeout after `2` retries.
 *
 * @param {*} queryApi
 */
export const patchQueryApi = (queryApi) => {
  const exclude = new Set(['substrate.code']);

  for (const modName of Object.keys(queryApi)) {
    const mod = queryApi[modName];

    for (const method of Object.keys(mod)) {
      const path = `${modName}.${method}`;

      if (!exclude.has(path)) {
        wrapFnWithRetries(mod, method, [modName, method]);
      }
    }
  }
};

/**
 * Wraps provided `send` function into the function that will retry to send transaction again in case of failure.
 * Timeouts and other configuration details are based on the block times.
 *
 * @param {DockAPI} dock
 * @param {*} extrinsic
 * @param {?boolean} waitForFinalization
 * @returns {Promise<SubmittableResult>}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export async function sendWithRetries(dock, extrinsic, waitForFinalization = true) {
  const { api } = dock;

  const blockTime = api.consts.babe.expectedBlockTime.toNumber();
  const isFastBlock = blockTime === FASTBLOCK_TIME;
  if (!isFastBlock && blockTime !== STANDARD_BLOCK_TIME) {
    throw new Error(`Unexpected block time: ${blockTime}, expected either ${STANDARD_BLOCK_TIME} or ${FASTBLOCK_TIME}`);
  }
  const config = isFastBlock ? FASTBLOCK_CONFIG : STANDARD_CONFIG;

  let sent;

  const errorRegExp = /Transaction is (temporarily banned|outdated)|The operation was aborted/;
  const onError = async (err, retrySym) => {
    sent.unsubscribe();

    if (!errorRegExp.test(err?.message || '')) {
      throw err;
    }

    const txHash = extrinsic.hash;

    let block;
    try {
      const lastHash = await (waitForFinalization
        ? api.rpc.chain.getFinalizedHead()
        : api.rpc.chain.getBlockHash());
      const blockNumber = (
        await api.rpc.chain.getBlock(lastHash)
      ).block.header.number.toNumber();

      const blockNumbersToCheck = Array.from(
        { length: config.FETCH_BLOCKS_COUNT },
        (_, idx) => blockNumber - idx,
      );

      block = await findExtrinsicBlock(api, blockNumbersToCheck, txHash);
    } catch (txErr) {
      console.error(`Failed to find transaction's block: \`${txErr}\``);
    }

    if (block != null) {
      const blockHash = block.block.header.hash;

      const status = api.createType(
        'ExtrinsicStatus',
        waitForFinalization
          ? {
            finalized: blockHash,
          }
          : { inBlock: blockHash },
      );
      const filtered = filterEvents(txHash, block, block.events, status);

      ensureExtrinsicSucceeded(api, filtered.events, status);

      return new SubmittableResult({
        ...filtered,
        status,
        txHash,
      });
    }

    return retrySym;
  };

  const sendExtrinsic = async () => {
    sent = dock.sendNoRetry(extrinsic, waitForFinalization);
    return await sent;
  };

  const onTimeoutExceeded = (retrySym) => {
    sent.unsubscribe();
    // eslint-disable-next-line no-underscore-dangle
    const Sub = createSubmittable(api._type, api._rx, api._decorateMethod);
    // eslint-disable-next-line no-param-reassign
    extrinsic = Sub(extrinsic.toU8a());
    console.error(`Timeout exceeded for the extrinsic \`${extrinsic.hash}\``);

    return retrySym;
  };

  const baseTimeout = waitForFinalization
    ? config.FINALIZED_TIMEOUT
    : config.IN_BLOCK_TIMEOUT;

  return await retry(sendExtrinsic, 1e3 + baseTimeout, {
    maxAttempts: config.MAX_ATTEMPTS,
    delay: config.DELAY,
    onTimeoutExceeded,
    onError,
  });
}
/* eslint-enable sonarjs/cognitive-complexity */
