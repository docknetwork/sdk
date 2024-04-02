import { BlockHash, BlockNumber } from '@polkadot/types/interfaces'; // eslint-disable-line
import { SignedBlockExtended } from '@polkadot/types/types'; // eslint-disable-line

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
   * @param {*} [configuration.api]
   * @param {boolean} [configuration.finalized=false]
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
