import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { HttpProvider } from '@polkadot/rpc-provider';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import typesBundle from '@docknetwork/node-types';
import { KeyringPair } from "@polkadot/keyring/types"; // eslint-disable-line

import AnchorModule from './modules/anchor';
import BlobModule from './modules/blob';
import { DIDModule } from './modules/did';
import RevocationModule from './modules/revocation';
import TokenMigration from './modules/migration';
import StatusListCredentialModule from './modules/status-list-credential';
import BBSModule from './modules/bbs';
import BBSPlusModule from './modules/bbs-plus';
import LegacyBBSPlusModule from './modules/legacy-bbs-plus';
import PSModule from './modules/ps';
import OffchainSignaturesModule from './modules/offchain-signatures';
import AccumulatorModule from './modules/accumulator';

import PoaRpcDefs from './rpc-defs/poa-rpc-defs';
import PriceFeedRpcDefs from './rpc-defs/price-feed-rpc-defs';
import CoreModsRpcDefs from './rpc-defs/core-mods-rpc-defs';

import TrustRegistryModule from './modules/trust-registry';
import {
  sendWithRetries,
  patchQueryApi,
  STANDARD_BLOCK_TIME_MS,
  FASTBLOCK_TIME_MS,
  FASTBLOCK_CONFIG,
  STANDARD_CONFIG,
} from './dock-api-retry';
import { ensureExtrinsicSucceeded } from './utils/extrinsic';

/**
 * @typedef {object} Options The Options to use in the function DockAPI.
 * @property {string} [address] The node address to connect to.
 * @property {object} [keyring] PolkadotJS keyring
 * @property {object} [chainTypes] Types for the chain
 * @property {object} [chainRpc] RPC definitions for the chain
 * @property {Boolean} [loadPoaModules] Whether to load PoA modules or not. Defaults to true
 */

/** Helper class to interact with the Dock chain */
export default class DockAPI {
  /**
   * Creates a new instance of the DockAPI object, call init to initialize
   * @param {function} [customSignTx] - Optional custom transaction sign method,
   * a function that expects `extrinsic` as first argument and a dock api instance as second argument
   * @constructor
   */
  constructor(customSignTx) {
    this.customSignTx = customSignTx;
    this.anchorModule = new AnchorModule();
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
    if (this.api) {
      if (this.api.isConnected) {
        throw new Error('API is already connected');
      } else {
        await this.disconnect();
      }
    }

    this.address = address || this.address;
    if (
      this.address
      && this.address.indexOf('wss://') === -1
      && this.address.indexOf('https://') === -1
    ) {
      console.warn(`WARNING: Using non-secure endpoint: ${this.address}`);
    }

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

    const isWebsocket = this.address && this.address.indexOf('http') === -1;
    const provider = isWebsocket
      ? new WsProvider(this.address)
      : new HttpProvider(this.address);

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

    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion();
    const specVersion = runtimeVersion.specVersion.toNumber();

    if (specVersion < 50) {
      apiOptions.types = {
        ...(apiOptions.types || {}),
        DidOrDidMethodKey: 'Did',
      };
      this.api = await ApiPromise.create(apiOptions);
    }
    this.api.specVersion = specVersion;
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

    this.anchorModule.setApi(this.api, this.signAndSend.bind(this));
    this.blobModule = new BlobModule(this.api, this.signAndSend.bind(this));
    this.didModule = new DIDModule(this.api, this.signAndSend.bind(this));
    this.revocationModule = new RevocationModule(
      this.api,
      this.signAndSend.bind(this),
    );
    this.trustRegistryModule = new TrustRegistryModule(
      this.api,
      this.signAndSend.bind(this),
    );
    this.statusListCredentialModule = new StatusListCredentialModule(
      this.api,
      this.signAndSend.bind(this),
    );
    this.legacyBBSPlus = this.api.tx.offchainSignatures == null;
    if (this.legacyBBSPlus) {
      this.bbsPlusModule = new LegacyBBSPlusModule(
        this.api,
        this.signAndSend.bind(this),
      );
    } else {
      this.offchainSignaturesModule = new OffchainSignaturesModule(
        this.api,
        this.signAndSend.bind(this),
      );
      this.bbsModule = new BBSModule(this.api, this.signAndSend.bind(this));
      this.bbsPlusModule = new BBSPlusModule(
        this.api,
        this.signAndSend.bind(this),
      );
      this.psModule = new PSModule(this.api, this.signAndSend.bind(this));
    }
    this.accumulatorModule = new AccumulatorModule(
      this.api,
      this.signAndSend.bind(this),
    );

    if (loadPoaModules) {
      this.migrationModule = new TokenMigration(this.api);
    }

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
    if (this.api) {
      if (this.api.isConnected) {
        await this.api.disconnect();
      }
      delete this.api;
      delete this.blobModule;
      delete this.didModule;
      delete this.revocationModule;
      delete this.offchainSignaturesModule;
      delete this.bbsModule;
      delete this.bbsPlusModule;
      delete this.psModule;
      delete this.accumulatorModule;
      delete this.migrationModule;
      delete this.legacyBBSPlus;
      delete this.statusListCredentialModule;
      delete this.trustRegistryModule;
    }
  }

  isInitialized() {
    return !!this.api;
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
      return this.customSignTx(extrinsic, params, this);
    }
    return extrinsic.signAsync(this.getAccount(), params);
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
        const { events = [], status } = extrResult;

        ensureExtrinsicSucceeded(this.api, events, status);

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
    if (!this.api) {
      return false;
    }

    return this.api.isConnected;
  }

  /**
   * Gets the SDK's Anchor module
   * @return {AnchorModule} The module to use
   */
  get anchor() {
    return this.anchorModule;
  }

  /**
   * Gets the SDK's Blob module
   * @return {BlobModule} The module to use
   */
  get blob() {
    if (!this.blobModule) {
      throw new Error('Unable to get Blob module, SDK is not initialised');
    }
    return this.blobModule;
  }

  /**
   * Gets the SDK's DID module
   * @return {DIDModule} The module to use
   */
  get did() {
    if (!this.didModule) {
      throw new Error('Unable to get DID module, SDK is not initialised');
    }
    return this.didModule;
  }

  /**
   * Gets the SDK's StatusListCredentialModule module
   * @return {StatusListCredentialModule} The module to use
   */
  get statusListCredential() {
    if (!this.statusListCredentialModule) {
      throw new Error(
        'Unable to get StatusListCredentialModule module, SDK is not initialised',
      );
    }
    return this.statusListCredentialModule;
  }

  /**
   * Gets the SDK's TrustRegistryModule module
   * @return {TrustRegistryModule} The module to use
   */
  get trustRegistry() {
    if (!this.trustRegistryModule) {
      throw new Error(
        'Unable to get TrustRegistryModule module, SDK is not initialised',
      );
    }
    return this.trustRegistryModule;
  }

  /**
   * Gets the SDK's OffchainSignaturesModule module
   * @return {OffchainSignaturesModule} The module to use
   */
  get offchainSignatures() {
    if (!this.didModule) {
      throw new Error(
        'Unable to get OffchainSignatures module, SDK is not initialised',
      );
    }
    return this.offchainSignaturesModule;
  }

  /**
   * Gets the SDK's revocation module
   * @return {RevocationModule} The module to use
   */
  get revocation() {
    if (!this.revocationModule) {
      throw new Error(
        'Unable to get revocation module, SDK is not initialised',
      );
    }
    return this.revocationModule;
  }

  /**
   * Gets the SDK's `BBS` module
   * @return {BBSModule} The module to use
   */
  get bbs() {
    if (this.legacyBBSPlus) {
      throw new Error("BBS isn't supported by the chain");
    }
    if (!this.bbsModule) {
      throw new Error('Unable to get BBS module, SDK is not initialised');
    }
    return this.bbsModule;
  }

  /**
   * Gets the SDK's `BBSPlus` module
   * @return {BBSPlusModule} The module to use
   */
  get bbsPlus() {
    if (!this.bbsPlusModule) {
      throw new Error('Unable to get BBS+ module, SDK is not initialised');
    }
    return this.bbsPlusModule;
  }

  /**
   * Gets the SDK's `PS` module
   * @return {PSModule} The module to use
   */
  get ps() {
    if (this.legacyBBSPlus) {
      throw new Error("PS isn't supported by the chain");
    }
    if (!this.psModule) {
      throw new Error('Unable to get PS module, SDK is not initialised');
    }
    return this.psModule;
  }

  /**
   * Gets the SDK's `Accumulator` module
   * @return {AccumulatorModule} The module to use
   */
  get accumulator() {
    if (!this.accumulatorModule) {
      throw new Error(
        'Unable to get Accumulator module, SDK is not initialised',
      );
    }
    return this.bbsPlusModule;
  }
}
