import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { HttpProvider } from '@polkadot/rpc-provider';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { KeyringPair } from '@polkadot/keyring/types'; // eslint-disable-line

import AnchorModule from './modules/anchor';
import BlobModule from './modules/blob';
import DIDModule from './modules/did';
import RevocationModule from './modules/revocation';
import TokenMigration from './modules/migration';
import BBSPlusModule from './modules/bbs-plus';
import AccumulatorModule from './modules/accumulator';
import PoaRpcDefs from './rpc-defs/poa-rpc-defs';
import PriceFeedRpcDefs from './rpc-defs/price-feed-rpc-defs';
import CoreModsRpcDefs from './rpc-defs/core-mods-rpc-defs';

import ExtrinsicError from './errors/extrinsic-error';

import {
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1,
} from './public-keys';

import {
  Signature,
  SignatureSr25519,
  SignatureEd25519,
} from './signatures';

function getExtrinsicError(data, typeDef, api) {
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
 * @typedef {object} Options The Options to use in the function DockAPI.
 * @property {string} [address] The node address to connect to.
 * @property {object} [keyring] PolkadotJS keyring
 * @property {object} [chainTypes] Types for the chain
 * @property {object} [chainRpc] RPC definitions for the chain
 * @property {Boolean} [loadPoaModules] Whether to load PoA modules or not. Defaults to true
 */

/** Helper class to interact with the Dock chain */
class DockAPI {
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
  async init({
    address, keyring, chainTypes, chainRpc, loadPoaModules = true,
  } = {
    address: null,
    keyring: null,
  }) {
    if (this.api) {
      if (this.api.isConnected) {
        throw new Error('API is already connected');
      } else {
        this.disconnect();
      }
    }

    this.address = address || this.address;
    if (this.address && (
      this.address.indexOf('wss://') === -1 && this.address.indexOf('https://') === -1
    )) {
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
    const provider = isWebsocket ? new WsProvider(this.address) : new HttpProvider(this.address);

    const apiOptions = {
      provider,
      // @ts-ignore: TS2322
      rpc,
    };

    if (chainTypes) {
      apiOptions.types = chainTypes;
    }

    this.api = await ApiPromise.create(apiOptions);

    await this.initKeyring(keyring);

    this.anchorModule.setApi(this.api, this.signAndSend.bind(this));
    this.blobModule = new BlobModule(this.api, this.signAndSend.bind(this));
    this.didModule = new DIDModule(this.api, this.signAndSend.bind(this));
    this.revocationModule = new RevocationModule(this.api, this.signAndSend.bind(this));
    this.bbsPlusModule = new BBSPlusModule(this.api, this.signAndSend.bind(this));
    this.accumulatorModule = new AccumulatorModule(this.api, this.signAndSend.bind(this));

    if (loadPoaModules) {
      this.migrationModule = new TokenMigration(this.api);
    }

    return this.api;
  }

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
      delete this.anchorModule;
      delete this.blobModule;
      delete this.didModule;
      delete this.revocationModule;
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
    return this.send(signedExtrinsic, waitForFinalization);
  }

  /**
   * Helper function to send a transaction that has already been signed
   * @param extrinsic - Extrinsic to send
   * @param waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in block.
   * @returns {Promise<unknown>}
   */
  async send(extrinsic, waitForFinalization = true) {
    const promise = new Promise((resolve, reject) => {
      try {
        let unsubFunc = null;
        return extrinsic.send((extrResult) => {
          const { events = [], status } = extrResult;

          // Ensure ExtrinsicFailed event doesnt exist
          for (let i = 0; i < events.length; i++) {
            const {
              event: {
                data, method, typeDef,
              },
            } = events[i];
            if (method === 'ExtrinsicFailed' || method === 'BatchInterrupted') {
              const errorMsg = getExtrinsicError(data, typeDef, this.api);
              const error = new ExtrinsicError(errorMsg, method, data, status, events);
              reject(error);
              return error;
            }
          }

          // If waiting for finalization or if not waiting for finalization, wait for inclusion in block.
          if ((waitForFinalization && status.isFinalized) || (!waitForFinalization && status.isInBlock)) {
            unsubFunc();
            resolve(extrResult);
          }

          return extrResult;
        })
          .catch((error) => {
            reject(error);
          })
          .then((unsub) => {
            unsubFunc = unsub;
          });
      } catch (error) {
        reject(error);
      }

      return this;
    });

    return await promise;
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
    if (!this.anchorModule) {
      throw new Error('Unable to get Anchor module, SDK is not initialised');
    }
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
   * Gets the SDK's revocation module
   * @return {RevocationModule} The module to use
   */
  get revocation() {
    if (!this.revocationModule) {
      throw new Error('Unable to get revocation module, SDK is not initialised');
    }
    return this.revocationModule;
  }

  get bbsPlus() {
    if (!this.bbsPlusModule) {
      throw new Error('Unable to get BBS+ module, SDK is not initialised');
    }
    return this.bbsPlusModule;
  }

  get accumulator() {
    if (!this.accumulatorModule) {
      throw new Error('Unable to get Accumulator module, SDK is not initialised');
    }
    return this.bbsPlusModule;
  }
}

export default new DockAPI();
export {
  AnchorModule,
  BlobModule,
  DockAPI,
  DIDModule,
  RevocationModule,
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1,
  Signature,
  SignatureSr25519,
  SignatureEd25519,
};
