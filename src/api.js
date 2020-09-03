import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { KeyringPair } from '@polkadot/keyring/types'; // eslint-disable-line

import BlobModule from './modules/blob';
import DIDModule from './modules/did';
import RevocationModule from './modules/revocation';
import PoAModule from './modules/poa';
import types from './types.json';

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

/**
 * @typedef {object} Options The Options to use in the function createUser.
 * @property {string} [address] The node address to connect to.
 * @property {object} [keyring] PolkadotJS keyring
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
  }

  /**
   * Initialises the SDK and connects to the node
   * @param {Options} config - Configuration options
   * @return {Promise} Promise for when SDK is ready for use
   */
  async init({ address, keyring } = {
    address: null,
    keyring: null,
  }) {
    if (this.api) {
      throw new Error('API is already connected');
    }

    this.address = address || this.address;

    this.api = await ApiPromise.create({
      provider: new WsProvider(this.address),
      types,
    });

    await this.initKeyring(keyring);

    this.blobModule = new BlobModule(this.api, this.signAndSend.bind(this));
    this.didModule = new DIDModule(this.api, this.signAndSend.bind(this));
    this.revocationModule = new RevocationModule(this.api, this.signAndSend.bind(this));
    this.poaModule = new PoAModule(this.api);

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
      await this.api.disconnect();
      delete this.api;
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
      await this.customSignTx(extrinsic, params, this);
    } else {
      await extrinsic.signAsync(this.getAccount(), params);
    }
  }

  /**
   * Helper function to send transaction
   * @param {object} extrinsic - Extrinsic to send
   * @param {Boolean} waitForFinalization - If true, waits for extrinsic's block to be finalized,
   * else only wait to be included in block.
   * @param {object} params - An object used to parameters like nonce, etc to the extrinsic
   * @return {Promise}
   */
  async signAndSend(extrinsic, waitForFinalization = true, params = {}) {
    await this.signExtrinsic(extrinsic, params);
    const promise = new Promise((resolve, reject) => {
      try {
        let unsubFunc = null;
        return extrinsic.send(({ events = [], status }) => {
          // If waiting for finalization
          if (waitForFinalization && status.isFinalized) {
            unsubFunc();
            resolve({
              events,
              status,
            });
          }

          // If not waiting for finalization, wait for inclusion in block.
          if (!waitForFinalization && status.isInBlock) {
            unsubFunc();
            resolve({
              events,
              status,
            });
          }
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

    const result = await promise;
    return result;
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

  /**
   * Get the PoA module
   * @return {PoAModule} The module to use
   */
  get poa() {
    if (!this.poa) {
      throw new Error('Unable to get PoA module, SDK is not initialised');
    }
    return this.poaModule;
  }
}

export default new DockAPI();
export {
  BlobModule,
  DockAPI,
  DIDModule,
  RevocationModule,
  PoAModule,
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1,
  Signature,
  SignatureSr25519,
  SignatureEd25519,
};
