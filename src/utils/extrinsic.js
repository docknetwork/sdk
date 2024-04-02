import { BlockHash, BlockNumber } from '@polkadot/types/interfaces'; // eslint-disable-line
import { SignedBlockExtended } from '@polkadot/types/types'; // eslint-disable-line
import ExtrinsicError from '../errors/extrinsic-error';

/**
 * Fetches and caches requested blocks by their hashes and optionally numbers.
 * `finalized` flag determines the last hash querying algorithm and whether blocks
 * can be cached by their numbers or not.
 * **It's a caller's responsibility to ensure that unfinalized blocks won't be queried/added
 * using `BlocksProvider` with `finalized=true`.**
 *
 */
export class BlocksProvider {
  /**
   *
   * @param {object} configuration
   * @param {*} api
   * @param {?boolean} [finalized=false]
   */
  constructor({ api, finalized = false } = {}) {
    this.api = api;
    this.finalized = finalized;

    this.byNumber = new Map();
    this.byHash = new Map();
  }

  /**
   * Returns the latest available hash for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockHash>}
   */
  async lastHash() {
    return await (this.finalized ? this.api.rpc.chain.getFinalizedHead() : this.api.rpc.chain.getBlockHash());
  }

  /**
   * Returns the latest available number for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockNumber>}
   */
  async lastNumber() {
    return (await this.blockByHash(await this.lastHash())).block.header.number;
  }

  /**
   * Adds supplied block to the local cache.
   *
   * @param {SignedBlockExtended} block
   */
  add(block) {
    const { block: { hash, header: { number } } } = block;

    if (this.finalized) {
      this.byNumber.set(String(number), block);
    }
    this.byHash.set(String(hash), block);
  }

  /**
   * Retrieves blocks by hash from either the local cache or by querying the node.
   *
   * @param {BlockHash|string} hash
   * @returns {Promise<SignedBlockExtended>}
   */
  async blockByHash(hash) {
    let block = this.cachedBlockByHash(hash);

    if (!block) {
      block = await this.api.derive.chain.getBlock(hash);
      this.add(block);
    }

    return block;
  }

  /**
   * Retrieves blocks by number from either the local cache or by querying the node.
   *
   * @param {BlockNumber|number} number
   * @returns {Promise<SignedBlockExtended>}
   */
  async blockByNumber(number) {
    return this.cachedBlockByNumber(number) ?? await this.blockByHash(await this.api.rpc.chain.getBlockHash(number));
  }

  /**
   * Retrieves blocks by hash from the local cache.
   *
   * @param {number} number
   * @returns {SignedBlockExtended}
   */
  cachedBlockByHash(hash) {
    return this.byHash.get(String(hash));
  }

  /**
   * Retrieves blocks by number from the local cache.
   *
   * @param {number} number
   * @returns {SignedBlockExtended}
   */
  cachedBlockByNumber(number) {
    return this.byNumber.get(String(number));
  }
}

/**
 * Attempts to find extrinsic with the given hash across the blocks with the supplied numbers.
 * Returns the found block in case of success.
 * **This method will concurrently request all candidate blocks at the same time.**
 * @param {BlocksProvider}
 * @param {Iterable<number>} blockNumbers
 * @param {Uint8Array|string} txHash
 * @returns {?object}
 */
export const findExtrinsicBlock = async (
  blockProvider,
  blockNumbers,
  txHash,
  // eslint-disable-next-line no-async-promise-executor
) => await new Promise(async (resolve, reject) => {
  try {
    await Promise.all(
      [...new Set(blockNumbers)].map(async (number) => {
        const block = await blockProvider.blockByNumber(number);

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
