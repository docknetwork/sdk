import { createSubmittable } from '@polkadot/api/submittable';
import { SubmittableResult } from '@polkadot/api/cjs/submittable/Result';
import { filterEvents } from '@polkadot/api/util';
import { retry } from './utils/misc';
import {
  ensureExtrinsicSucceeded,
  findExtrinsicBlock,
} from './utils/extrinsic';
import { BlocksProvider } from './utils/block';

/** Block time in ms for the standard build configuration. */
const STANDARD_BLOCK_TIME_MS = 3e3;
/** Block time in ms for the fastblock build configuration. */
const FASTBLOCK_TIME_MS = 5e2;

const STANDARD_CONFIG = {
  /** Amount of blocks to wait for the extrinsic to be finalized before retrying. */
  FINALIZED_TIMEOUT_BLOCKS: 5,
  /** Amount of blocks to wait for the extrinsic to be included in the block before retrying. */
  IN_BLOCK_TIMEOUT_BLOCKS: 3,
  /** Amount of blocks to wait before a retry attempt. */
  RETRY_DELAY_BLOCKS: 1,
  /** Block time in ms. */
  BLOCK_TIME_MS: STANDARD_BLOCK_TIME_MS,
  /** Max retry attempts (doesn't include initial request). */
  MAX_ATTEMPTS: 2,
  /** Amount of blocks to be fetched in addition to the strict amount of blocks. It will cover timing for fetching the block data. */
  FETCH_GAP_BLOCKS: 1,
};

const FASTBLOCK_CONFIG = {
  /** Amount of blocks to wait for the extrinsic to be finalized before retrying. */
  FINALIZED_TIMEOUT_BLOCKS: 8,
  /** Amount of blocks to wait for the extrinsic to be included in the block before retrying. */
  IN_BLOCK_TIMEOUT_BLOCKS: 4,
  /** Amount of blocks to wait before a retry attempt. */
  RETRY_DELAY_BLOCKS: 6,
  /** Block time in ms. */
  BLOCK_TIME_MS: FASTBLOCK_TIME_MS,
  /** Max retry attempts (doesn't include initial request). */
  MAX_ATTEMPTS: 3,
  /** Amount of blocks to be fetched in addition to the strict amount of blocks. It will cover timing for fetching the block data. */
  FETCH_GAP_BLOCKS: 5,
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
      newValue[key] = value[key];
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
 * Helper function to send with retries a transaction that has already been signed.
 * @param {DockAPI} dock
 * @param {*} extrinsic - Extrinsic to send
 * @param {boolean} [waitForFinalization=true] - If true, waits for extrinsic's block to be finalized,
 * @param {?object} retryConfig
 * else only wait to be included in the block.
 * @returns {Promise<SubmittableResult>}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export async function sendWithRetries(
  dock,
  extrinsic,
  waitForFinalization = true,
  retryConfig = { standard: STANDARD_CONFIG, fastblock: FASTBLOCK_CONFIG },
) {
  const { api } = dock;

  const blockTime = api.consts.babe.expectedBlockTime.toNumber();
  if (blockTime !== STANDARD_BLOCK_TIME_MS && blockTime !== FASTBLOCK_TIME_MS) {
    throw new Error(
      `Unexpected block time: ${blockTime}, expected either ${STANDARD_BLOCK_TIME_MS} or ${FASTBLOCK_TIME_MS}`,
    );
  }
  const isFastBlock = blockTime === FASTBLOCK_TIME_MS;
  const config = isFastBlock ? retryConfig.fastblock : retryConfig.standard;
  const extrTimeout = waitForFinalization
    ? config.FINALIZED_TIMEOUT_BLOCKS
    : config.IN_BLOCK_TIMEOUT_BLOCKS;
  const blocksProvider = new BlocksProvider({
    api,
    finalized: waitForFinalization,
  });

  let sent;
  const startTimestamp = +new Date();

  const errorRegExp = /Transaction is (temporarily banned|outdated)|The operation was aborted/;
  const onError = async (err, retrySym) => {
    sent.unsubscribe();

    if (!errorRegExp.test(err?.message || '')) {
      throw err;
    }

    const txHash = extrinsic.hash;

    let block;
    try {
      const lastBlockNumber = (await blocksProvider.lastNumber()).toNumber();
      const requestAmount = config.FETCH_GAP_BLOCKS
        + (((+new Date() - startTimestamp) / config.BLOCK_TIME_MS) | 0); // eslint-disable-line no-bitwise

      const blockNumbersToCheck = Array.from(
        { length: Math.min(lastBlockNumber + 1, requestAmount) },
        (_, idx) => lastBlockNumber - idx,
      );

      block = await findExtrinsicBlock(
        blocksProvider,
        blockNumbersToCheck,
        txHash,
      );
    } catch (txErr) {
      console.error(`Failed to find extrinsic's block: \`${txErr}\``);
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
    } else {
      console.error(
        `Transaction \`${txHash}\` is not yet ${
          waitForFinalization ? 'finalized' : 'included in the block'
        }`,
      );
    }

    return retrySym;
  };

  const sendExtrinsic = async () => {
    sent = dock.sendNoRetries(extrinsic, waitForFinalization);
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

  const timeout = config.BLOCK_TIME_MS * extrTimeout;

  return await retry(sendExtrinsic, 1e3 + timeout, {
    maxAttempts: config.MAX_ATTEMPTS,
    delay: config.BLOCK_TIME_MS * config.RETRY_DELAY_BLOCKS,
    onTimeoutExceeded,
    onError,
  });
}
/* eslint-enable sonarjs/cognitive-complexity */
