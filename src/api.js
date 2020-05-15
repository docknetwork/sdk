import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { KeyringPair } from '@polkadot/keyring/types'; // eslint-disable-line

import BlobModule from './modules/blob';
import DIDModule from './modules/did';
import RevocationModule from './modules/revocation';
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
   * Skeleton constructor, does nothing yet
   * @constructor
   * @param {string} address - WebSocket RPC endpoint
   */
  constructor(address = null) {
    this.address = address;
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

    // Polkadot-js needs these extra type information to work. Removing them will lead to
    // an error. These were taken from substrate node frontend template.
    const extraTypes = {
      Address: 'AccountId',
      LookupSource: 'AccountId',
    };

    this.api = await ApiPromise.create({
      provider: new WsProvider(this.address),
      types: {
        ...types,
        ...extraTypes,
      },
    });

    this.blobModule = new BlobModule(this.api);
    this.didModule = new DIDModule(this.api);
    this.revocationModule = new RevocationModule(this.api);

    await cryptoWaitReady();

    if (!this.keyring || keyring) {
      this.keyring = new Keyring(keyring || { type: 'sr25519' });
    }

    return this.api;
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
   * Helper function to send transaction
   * @param {object} extrinsic - Extrinsic to send
   * @param {Boolean} unsubscribe - Should we unsubscribe from the transaction after its finalized
   * @return {Promise}
   */
  async sendTransaction(extrinsic, unsubscribe = true) {
    return new Promise((resolve, reject) => {
      const account = this.getAccount();
      let unsubFunc = null;
      try {
        extrinsic
          .signAndSend(account, ({ events = [], status }) => {
            if (status.isFinalized) {
              if (unsubscribe && unsubFunc) {
                unsubFunc();
              }
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
    });
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
}

export default new DockAPI();
export {
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
