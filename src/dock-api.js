import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { HttpProvider } from '@polkadot/rpc-provider';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import typesBundle from '@docknetwork/node-types';
import { filterEvents } from '@polkadot/api/util';
import { KeyringPair } from "@polkadot/keyring/types"; // eslint-disable-line

import { createSubmittable } from '@polkadot/api/submittable';
import { SubmittableResult } from '@polkadot/api/cjs/submittable/Result';
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

import ExtrinsicError from './errors/extrinsic-error';
import TrustRegistryModule from './modules/trust-registry';
import { findExtrinsicBlock, retry } from './utils/misc';

function getExtrinsicError(data, api) {
  // Loop through each of the parameters
  // trying to find module error information
  let errorMsg = 'Extrinsic failed submission:';
  data.forEach((error) => {
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
        const that = this;
        const wrappedFn = () => value.apply(that, args);
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
const patchQueryApi = (queryApi) => {
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

    const { send } = this;
    this.send = async function sendWithRetries(
      extrinsic,
      waitForFinalization = true,
    ) {
      let sent;
      const onTimeoutExceeded = (retrySym) => {
        sent.unsubscribe();
        const { api } = this;
        // eslint-disable-next-line no-underscore-dangle
        const Sub = createSubmittable(api._type, api._rx, api._decorateMethod);
        // eslint-disable-next-line no-param-reassign
        extrinsic = Sub(extrinsic.toU8a());
        console.error(
          `Timeout exceeded for the extrinsic \`${extrinsic.hash}\``,
        );

        return retrySym;
      };
      const fn = async () => {
        sent = send.call(this, extrinsic, waitForFinalization);
        return sent;
      };
      fn.toString = () => send.toString();

      const blockTime = this.api.consts.babe.expectedBlockTime.toNumber();

      return await retry(fn, 1e3 + (waitForFinalization ? 5 * blockTime : 3 * blockTime), {
        maxAttempts: 2,
        delay: blockTime,
        onTimeoutExceeded,
      });
    };
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
   * Helper function to send a transaction that has already been signed
   * @param extrinsic - Extrinsic to send
   * @param waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in block.
   * @returns {Promise<unknown>}
   */
  /* eslint-disable sonarjs/cognitive-complexity */
  send(extrinsic, waitForFinalization = true) {
    let unsubFn = null;
    let unsubscribed = false;

    const checkEvents = (events, status) => {
      // Ensure ExtrinsicFailed event doesnt exist
      for (let i = 0; i < events.length; i++) {
        const {
          event: { data, method },
        } = events[i];
        if (method === 'ExtrinsicFailed' || method === 'BatchInterrupted') {
          const errorMsg = getExtrinsicError(data, this.api);
          throw new ExtrinsicError(errorMsg, method, data, status, events);
        }
      }
    };

    const promise = new Promise((resolve, reject) => extrinsic
      .send((extrResult) => {
        const { events = [], status } = extrResult;

        checkEvents(events, status);

        // If waiting for finalization or if not waiting for finalization, wait for inclusion in block.
        if (
          (waitForFinalization && status.isFinalized)
            || (!waitForFinalization && status.isInBlock)
        ) {
          resolve(extrResult);
        }
      })
      .catch(async (err) => {
        if (
          /Transaction is (temporarily banned|outdated)/.test(
            err?.message || '',
          )
        ) {
          try {
            const txHash = extrinsic.hash;
            const finalizedHash = await this.api.rpc.chain.getFinalizedHead();
            const blockNumber = (
              await this.api.derive.chain.getBlock(finalizedHash)
            ).block.header.number.toNumber();
            const blockTime = this.api.consts.babe.expectedBlockTime.toNumber();

            const blockNumbersToCheck = Array.from(
              { length: blockTime === 3e3 ? 10 : 15 },
              (_, idx) => blockNumber - idx,
            );

            const block = await findExtrinsicBlock(
              this.api,
              blockNumbersToCheck,
              txHash,
            );

            if (block != null) {
              const status = this.api.createType('ExtrinsicStatus', {
                finalized: block.block.header.hash,
              });
              const filtered = filterEvents(
                txHash,
                block,
                block.events,
                status,
              );

              checkEvents(filtered.events, status);

              const result = new SubmittableResult({
                ...filtered,
                status,
                txHash,
              });

              resolve(result);
            }
          } catch (internalErr) {
            reject(internalErr);
          }
        } else {
          reject(err);
        }
      })
      .then((unsub) => {
        if (typeof unsub === 'function') {
          if (unsubscribed) {
            unsub();
          } else {
            unsubFn = unsub;
          }
        }
      })).finally(() => void promise.unsubscribe());

    promise.unsubscribe = () => {
      if (unsubscribed) {
        return false;
      }
      unsubscribed = true;

      if (unsubFn != null) {
        unsubFn();
      }

      return true;
    };

    return promise;
  }
  /* eslint-enable sonarjs/cognitive-complexity */

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
