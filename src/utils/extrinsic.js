import ExtrinsicError from '../errors/extrinsic-error';

export class BlocksCache {
  constructor({ finalized = false } = {}) {
    this.finalized = finalized;
    this.byNumber = new Map();
    this.byHash = new Map();
  }

  set(hash, number, block) {
    if (this.finalized) {
      this.byNumber.set(number, block);
    }
    this.byHash.set(hash, block);
  }

  blockByNumber(number) {
    return this.byNumber.get(number);
  }

  blockByHash(hash) {
    return this.byHash.get(hash);
  }
}

/**
 * Attempts to find extrinsic with the given hash across the blocks with the supplied numbers.
 * Returns the found block in case of success.
 * **This method will concurrently request all candidate blocks at the same time.**
 *
 * @param {ApiPromise} api
 * @param {Iterable<number>} blockNumbers
 * @param {Uint8Array|string} txHash
 * @returns {?object}
 */
// eslint-disable-next-line no-async-promise-executor
export const findExtrinsicBlock = async (api, blockNumbers, txHash, blocksCache = null) => await new Promise(async (resolve, reject) => {
  const blockHashByNumber = async (number) => await api.rpc.chain.getBlockHash(number);
  const blockByHash = async (hash) => await api.derive.chain.getBlock(hash);

  try {
    await Promise.all(
      [...new Set(blockNumbers)].map(async (number) => {
        let block;
        if (blocksCache != null) {
          block = blocksCache.blockByNumber(number);
          if (!block) {
            const blockHash = await blockHashByNumber(number);
            block = blocksCache.blockByHash(blockHash) ?? await blockByHash(blockHash);
            blocksCache.set(blockHash, number, block);
          }
        } else {
          block = await blockByHash(await blockHashByNumber(number));
        }

        const found = block.block.extrinsics.some(
          (extr) => String(extr.hash) === String(txHash),
        );

        if (found) {
          resolve(block);
        }
      }),
    );

    resolve(null);
  } catch (err) {
    reject(err);
  }
});

/**
 * Extracts error from the supplied event data.
 *
 * @param {*} api
 * @param {*} data
 * @returns {string}
 */
export function errorMsgFromEventData(api, eventData) {
  // Loop through each of the parameters
  // trying to find module error information
  let errorMsg = 'Extrinsic failed submission:';
  eventData.forEach((error) => {
    if (error.isModule) {
      // for module errors, we have the section indexed, lookup
      try {
        const decoded = api.registry.findMetaError(error.asModule);
        const { docs, method, section } = decoded;
        errorMsg += `\n${section}.${method}: ${docs.join(' ')}`;
      } catch (e) {
        errorMsg += `\nError at module index: ${error.asModule.index} Error: ${error.asModule.error}`;
      }
    } else {
      const errorStr = error.toString();
      if (errorStr !== '0') {
        errorMsg += `\n${errorStr}`; // Other, CannotLookup, BadOrigin, no extra info
      }
    }
  });
  return errorMsg;
}

/**
 * Checks supplied events and in case either of them indicates transaction failure, throws an error.
 *
 * @param {*} api
 * @param {*} events
 * @param {*} status
 */
export const ensureExtrinsicSucceeded = (api, events, status) => {
  // Ensure ExtrinsicFailed event doesnt exist
  for (let i = 0; i < events.length; i++) {
    const {
      event: { data: eventData, method },
    } = events[i];
    if (method === 'ExtrinsicFailed' || method === 'BatchInterrupted') {
      const errorMsg = errorMsgFromEventData(api, eventData);
      throw new ExtrinsicError(errorMsg, method, eventData, status, events);
    }
  }
};
