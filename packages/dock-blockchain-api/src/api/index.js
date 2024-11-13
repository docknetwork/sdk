import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { HttpProvider } from '@polkadot/rpc-provider';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import typesBundle from '@docknetwork/node-types';
import { TypedEnum } from '@docknetwork/credential-sdk/types/generic';

import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import {
  DIDRef,
  DockDidOrDidMethodKey,
  NamespaceDid,
} from '@docknetwork/credential-sdk/types';
import PoaRpcDefs from './rpc-defs/poa-rpc-defs';
import PriceFeedRpcDefs from './rpc-defs/price-feed-rpc-defs';
import CoreModsRpcDefs from './rpc-defs/core-mods-rpc-defs';

import {
  sendWithRetries,
  patchQueryApi,
  STANDARD_BLOCK_TIME_MS,
  FASTBLOCK_TIME_MS,
  FASTBLOCK_CONFIG,
  STANDARD_CONFIG,
} from './retry';
import {
  ExtrinsicDispatchError,
  ensureExtrinsicSucceeded,
  errorMsgFromEventData,
} from '../utils/extrinsic';
import { getAllExtrinsicsFromBlock } from '../utils/chain-ops';

/**
 * @typedef {object} Options The Options to use in the function DockAPI.
 * @property {string} [address] The node address to connect to.
 * @property {object} [keyring] PolkadotJS keyring
 * @property {object} [chainTypes] Types for the chain
 * @property {object} [chainRpc] RPC definitions for the chain
 * @property {Boolean} [loadPoaModules] Whether to load PoA modules or not. Defaults to true
 */

/** Helper class to interact with the Dock chain */
export default class DockAPI extends AbstractApiProvider {
  /**
   * Creates a new instance of the DockAPI object, call init to initialize
   * @param {function} [customSignTx] - Optional custom transaction sign method,
   * a function that expects `extrinsic` as first argument and a dock api instance as second argument
   * @constructor
   */
  constructor(customSignTx) {
    super();

    this.customSignTx = customSignTx;
  }

  /**
   * Initializes the SDK and connects to the node
   * @param {Options} config - Configuration options
   * @return {Promise} Promise for when SDK is ready for use
   */
  /* eslint-disable sonarjs/cognitive-complexity */
  async init(
    {
      address, keyring, chainTypes, chainRpc, loadPoaModules = true,
    } = {
      address: null,
      keyring: null,
    },
  ) {
    if (this.isConnected) {
      throw new Error('API is already connected');
    }

    this.address = address || this.address;

    const addressArray = Array.isArray(this.address)
      ? this.address
      : [this.address];

    addressArray.forEach((addr) => {
      if (
        typeof addr === 'string'
        && addr.indexOf('wss://') === -1
        && addr.indexOf('https://') === -1
      ) {
        console.warn(`WARNING: Using non-secure endpoint: ${addr}`);
      }
    });

    // If RPC methods given, use them else set it to empty object.
    let rpc = chainRpc || {};

    // Initialize price feed rpc
    rpc = Object.assign(rpc, PriceFeedRpcDefs);

    // Initialize the RPC for core modules
    rpc = Object.assign(rpc, CoreModsRpcDefs);

    // If using PoA module, extend the RPC methods with PoA specific ones.
    if (loadPoaModules) {
      rpc = Object.assign(rpc, PoaRpcDefs);
    }

    // NOTE: The correct way to handle would be to raise error if a mix of URL types is provided or accept a preference of websocket vs http.
    const addressStr = addressArray[0];
    const isWebsocket = addressStr && addressStr.indexOf('http') === -1;

    if (!isWebsocket && addressArray.length > 1) {
      console.warn(
        'WARNING: HTTP connections do not support more than one URL, ignoring rest',
      );
    }

    const provider = isWebsocket
      ? new WsProvider(addressArray)
      : new HttpProvider(addressStr);

    const apiOptions = {
      provider,
      // @ts-ignore: TS2322
      rpc,
    };

    if (chainTypes) {
      apiOptions.types = chainTypes;
    } else {
      apiOptions.typesBundle = typesBundle;
    }

    this.api = await ApiPromise.create(apiOptions);

    const blockTime = this.api.consts.babe.expectedBlockTime.toNumber();
    if (
      blockTime !== STANDARD_BLOCK_TIME_MS
      && blockTime !== FASTBLOCK_TIME_MS
    ) {
      throw new Error(
        `Unexpected block time: ${blockTime}, expected either ${STANDARD_BLOCK_TIME_MS} or ${FASTBLOCK_TIME_MS}`,
      );
    }
    this.api.isFastBlock = blockTime === FASTBLOCK_TIME_MS;

    await this.initKeyring(keyring);

    patchQueryApi(this.api.query);
    patchQueryApi(this.api.queryMulti);

    return this.api;
  }
  /* eslint-enable sonarjs/cognitive-complexity */

  async initKeyring(keyring = null) {
    if (!this.keyring || keyring) {
      await cryptoWaitReady();
      this.keyring = new Keyring(keyring || { type: 'sr25519' });
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.api.disconnect();
    }
  }

  isInitialized() {
    return this.api != null;
  }

  /** TODO: Should probably use set/get and rename account to _account
   * Sets the account used to sign transactions
   * @param {KeyringPair} account - PolkadotJS Keyring account
   */
  setAccount(account) {
    this.account = account;
  }

  /**
   * Gets the current account used to sign transactions
   * @return {KeyringPair} PolkadotJS Keyring account
   */
  getAccount() {
    return this.account;
  }

  /**
   * Signs an extrinsic with either the set account or a custom sign method (see constructor)
   * @param {object} extrinsic - Extrinsic to send
   * @param {object} params - An object used to parameters like nonce, etc to the extrinsic
   * @return {Promise}
   */
  async signExtrinsic(extrinsic, params = {}) {
    if (this.customSignTx) {
      return await this.customSignTx(extrinsic, params, this);
    }
    return await extrinsic.signAsync(this.getAccount(), params);
  }

  /**
   * Helper function to sign and send transaction
   * @param {object} extrinsic - Extrinsic to sign and send
   * @param {Boolean} waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in block.
   * @param {object} params - An object used to parameters like nonce, etc to the extrinsic
   * @return {Promise}
   */
  async signAndSend(extrinsic, waitForFinalization = true, params = {}) {
    const signedExtrinsic = await this.signExtrinsic(extrinsic, params);

    return await this.send(signedExtrinsic, waitForFinalization);
  }

  /**
   * Retreives all extrinsics from the block with supplied number/hash.
   *
   * @param {*} blockNumberOrHash
   * @param {boolean} includeAllExtrinsics
   * @returns {Promise<*>}
   */
  async getAllExtrinsicsFromBlock(blockNumberOrHash, includeAllExtrinsics) {
    return await getAllExtrinsicsFromBlock(
      this.api,
      blockNumberOrHash,
      includeAllExtrinsics,
    );
  }

  /**
   * Helper function to send with retries a transaction that has already been signed.
   * @param extrinsic - Extrinsic to send
   * @param waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in the block.
   * @returns {Promise<SubmittableResult>}
   */
  async send(extrinsic, waitForFinalization = true) {
    return await sendWithRetries(
      this,
      extrinsic,
      waitForFinalization,
      this.api.isFastBlock ? FASTBLOCK_CONFIG : STANDARD_CONFIG,
    );
  }

  /**
   * Converts supplied payload to bytes representing state change with the provided name.
   * @param {string} name
   * @param {object} payload
   * @returns {Uint8Array}
   */
  async stateChangeBytes(name, payload) {
    return this.api.createType('StateChange', { [name]: payload }).toU8a();
  }

  /**
   * Batches supplied transactions into a single call.
   * @param {Array<SubmittableExtrinsic>}
   * @returns {SubmittableExtrinsics}
   */
  async batchAll(transactions) {
    return this.api.tx.utility.batchAll(transactions);
  }

  /**
   * Helper function to send without retrying a transaction that has already been signed.
   * @param {DockAPI} dock
   * @param {*} extrinsic - Extrinsic to send
   * @param {boolean} waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in the block.
   * @returns {Promise<SubmittableResult>}
   */
  sendNoRetries(extrinsic, waitForFinalization) {
    let unsubscribe = null;
    let unsubscribed = false;

    const promise = new Promise((resolve, reject) => extrinsic
      .send((extrResult) => {
        const { events = [], status, dispatchError } = extrResult;

        try {
          if (dispatchError != null) {
            const msg = errorMsgFromEventData(this.api, [dispatchError]);

            throw new ExtrinsicDispatchError(msg, status, dispatchError);
          }

          ensureExtrinsicSucceeded(this.api, events, status);
        } catch (err) {
          reject(err);
        }

        // If waiting for finalization or if not waiting for finalization, wait for inclusion in the block.
        if (
          (waitForFinalization && status.isFinalized)
            || (!waitForFinalization && status.isInBlock)
        ) {
          resolve(extrResult);
        }
      })
      .then((unsub) => {
        if (typeof unsub === 'function') {
          // `unsubscribed=true` here means that we unsubscribed from this function even before we had a callback set.
          // Thus we just call this function to unsubscribe.
          if (unsubscribed) {
            unsub();
          } else {
            unsubscribe = unsub;
          }
        }
      })
      .catch(reject)).finally(() => void promise.unsubscribe());

    promise.unsubscribe = () => {
      if (unsubscribed) {
        return false;
      }

      if (unsubscribe != null) {
        try {
          unsubscribe();
          unsubscribed = true;
        } catch (err) {
          throw new Error(
            `Failed to unsubscribe from watching extrinsic's status: \`${err}\``,
          );
        }
      }

      return true;
    };

    return promise;
  }

  /**
   * Checks if the API instance is connected to the node
   * @return {Boolean} The connection status
   */
  get isConnected() {
    return Boolean(this.api) && this.api.isConnected;
  }

  methods() {
    return ['dock'];
  }

  supportsIdentifier(id) {
    this.ensureInitialized();

    if (id instanceof NamespaceDid) {
      return id.isDock || id.isDidMethodKey;
    } else if (id instanceof DockDidOrDidMethodKey) {
      return true;
    } else if (id instanceof DIDRef) {
      return this.supportsIdentifier(id[0]);
    } else if (id instanceof TypedEnum) {
      return this.supportsIdentifier(id.value);
    } else if (id?.constructor?.Qualifier?.includes(':dock:')) {
      return true;
    }

    return false;
  }
}
