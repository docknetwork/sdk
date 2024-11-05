// import { BlockHash, BlockNumber } from "@polkadot/types/interfaces"; // eslint-disable-line
// import { SignedBlockExtended } from "@polkadot/types/types"; // eslint-disable-line
import { ApiPromise } from "@polkadot/api"; // eslint-disable-line
import {
  ReusablePromiseMap,
  ReusablePromise,
} from '@docknetwork/credential-sdk/utils';

/**
 * Fetches and caches blocks by their hashes and optionally numbers.
 * `finalized` flag determines the last hash/number querying algorithms
 * and whether blocks will be cached by their numbers or not.
 */
export class BlocksProvider {
  /**
   *
   * @param {object} configuration
   * @param {ApiPromise} [configuration.api]
   * @param {boolean} [configuration.cacheCapacity=100]
   * @param {boolean} [configuration.finalized=false]
   */
  constructor({ api, cacheCapacity = 100, finalized = false } = {}) {
    this.api = api;
    this.finalized = finalized;

    this.lastHashCall = new ReusablePromise();
    this.blockByHashCalls = new ReusablePromiseMap({
      capacity: cacheCapacity,
      save: true,
    });
    this.blockByNumberCalls = new ReusablePromiseMap({
      capacity: cacheCapacity,
      save: finalized,
    });

    this.maxBlockNumber = 0;
  }

  /**
   * Returns the latest available hash for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockHash>}
   */
  async lastHash() {
    return await this.lastHashCall.call(() => (this.finalized
      ? this.api.rpc.chain.getFinalizedHead()
      : this.api.rpc.chain.getBlockHash()));
  }

  /**
   * Returns the latest available number for the block (finalized if `finalized=true`).
   *
   * @returns {Promise<BlockNumber>}
   */
  async lastNumber() {
    const hash = await this.lastHash();

    const {
      block: {
        header: { number },
      },
    } = await this.blockByHash(hash);
    this.maxBlockNumber = Math.max(number.toNumber(), this.maxBlockNumber);

    return number;
  }

  /**
   * Retrieves blocks by hash from either the local cache or by querying the node.
   *
   * @param {BlockHash|string} hash
   * @returns {Promise<SignedBlockExtended>}
   */
  async blockByHash(hash) {
    return await this.blockByHashCalls.callByKey(String(hash), () => this.api.derive.chain.getBlock(hash));
  }

  /**
   * Retrieves blocks by number from either the local cache or by querying the node.
   * This function will check that the provided block number is less than the latest known
   * (best or finalized depending on the `finalized` flag).
   *
   * @param {BlockNumber|number} numberOrBlockNumber
   * @param {object} [configuration={}]
   * @param {boolean} [configuration.skipCheck=false] - forces number check to be skipped.
   * @returns {Promise<SignedBlockExtended>}
   */
  async blockByNumber(numberOrBlockNumber, { skipCheck = false } = {}) {
    const number = Number(String(numberOrBlockNumber));

    // If `skipCheck=true` isn't supplied, check that the provided block number is less than the latest known
    // (best or finalized depending on the `finalized` flag).
    if (!skipCheck && number > this.maxBlockNumber) {
      // Fetch the latest block number. It will be recorded in the `this.maxBlockNumber`.
      await this.lastNumber();

      if (number > this.maxBlockNumber) {
        throw new Error(
          `Provided block's number ${number} is higher than the latest known block number ${this.maxBlockNumber}`,
        );
      }
    }

    return await this.blockByNumberCalls.callByKey(
      String(numberOrBlockNumber),
      async () => await this.blockByHash(
        await this.api.rpc.chain.getBlockHash(numberOrBlockNumber),
      ),
    );
  }
}
