import { BlockHash, BlockNumber } from "@polkadot/types/interfaces"; // eslint-disable-line
import { SignedBlockExtended } from "@polkadot/types/types"; // eslint-disable-line
import { PromiseMap } from './misc';

const LAST_HASH = Symbol('LAST_HASH');

/**
 * Fetches and caches requestMap blocks by their hashes and optionally numbers.
 * `finalized` flag determines the last hash/number querying algorithms and whether blocks
 * can be cached by their numbers or not.
 *
 */
export class BlocksProvider {
  /**
   *
   * @param {object} configuration
   * @param {*} [configuration.api]
   * @param {boolean} [configuration.finalized=false]
   */
  constructor({ api, finalized = false } = {}) {
    this.api = api;
    this.finalized = finalized;

    this.byNumber = new Map();
    this.byHash = new Map();
    this.maxBlockNumber = 0;

    this.requestMap = new PromiseMap();
  }

  /**
   * Returns the latest available hash for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockHash>}
   */
  async lastHash() {
    return await (this.finalized
      ? this.api.rpc.chain.getFinalizedHead()
      : this.api.rpc.chain.getBlockHash());
  }

  /**
   * Returns the latest available number for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockNumber>}
   */
  async lastNumber() {
    const hash = await this.requestMap.useKey(LAST_HASH, () => this.lastHash());

    const {
      block: {
        header: { number },
      },
    } = await this.blockByHash(hash, { skipCheck: true });
    this.maxBlockNumber = Math.max(number.toNumber(), this.maxBlockNumber);

    return number;
  }

  /**
   * Adds supplied block to the local cache.
   *
   * @param {SignedBlockExtended} block
   * @param {object} configuration
   * @param {boolean} [configuration.skipCheck=false]
   */
  async setBlock(block, { skipCheck = false } = {}) {
    const {
      block: {
        hash,
        header: { number },
      },
    } = block;

    if (!skipCheck && number.toNumber() > this.maxBlockNumber) {
      await this.lastNumber();

      if (number.toNumber() > this.maxBlockNumber) {
        throw new Error(
          "Provided block's number is higher than the latest known block number",
        );
      }
    }

    if (this.finalized) {
      this.byNumber.set(String(number), block);
    }
    this.byHash.set(String(hash), block);
  }

  /**
   * Retrieves blocks by hash from either the local cache or by querying the node.
   *
   * @param {BlockHash|string} hash
   * @param {object} configuration
   * @param {boolean} [configuration.skipCheck=false]
   * @returns {Promise<SignedBlockExtended>}
   */
  async blockByHash(hash, { skipCheck = false } = {}) {
    let block = this.cachedBlockByHash(hash);

    if (block == null) {
      block = await this.requestMap.useKey(String(hash), () => this.api.derive.chain.getBlock(hash));
      await this.setBlock(block, { skipCheck });
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
    return (
      this.cachedBlockByNumber(number)
      ?? (await this.blockByHash(await this.api.rpc.chain.getBlockHash(number)))
    );
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
