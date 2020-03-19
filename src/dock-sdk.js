import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import {cryptoWaitReady} from '@polkadot/util-crypto';

import RevocationModule from './modules/revocation';
import DIDModule from './modules/did';
import types from './types.json';

import {
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1
} from './public-key';

import {
  Signature,
  SignatureSr25519,
  SignatureEd25519
} from './signature';

/** Helper class to interact with the Dock chain */
class DockSDK {
  /**
   * Skeleton constructor, does nothing yet
   * @constructor
   * @param {string} address - WebSocket RPC endpoint
   */
  constructor(address) {
    this.address = address;
  }

  /**
   * Initialises the SDK and connects to the node
   * @param {Account} address - Optional WebSocket address
   * @return {Promise} Promise for when SDK is ready for use
   */
  async init(address) {
    if (this.api) {
      throw new Error('API is already connected');
    }

    this.address = address || this.address;

    this.api = await ApiPromise.create({
      provider: new WsProvider(this.address),
      types,
      /*typesAlias: {
        // Renaming types of `didModule`
        didModule: {
          // `CustomSignature` is called `Signature` in the Node runtime. The renaming is to prevent conflict with the existing type called `Signature`.
          Signature: 'CustomSignature'
        }
      }*/
    });

    this._did = new DIDModule(this.api);
    this._revocation = new RevocationModule(this.api);

    return (await cryptoWaitReady());
  }

  async disconnect() {
    // TODO: proper d/c
    delete this.api;
  }

  /**
   * Check if the SDK has been given an account to send transactions
   * @returns {boolean}
   */
  hasAccount() {
    return !!this.account;
  }

  /**
   * Sets the account used to sign transactions
   * @param {Account} account - PolkadotJS Keyring account
   */
  async setAccount(account, uri, options) {
    if (account) {
      this.account = account;
    } else {
      this.account = this.keyring.addFromUri(uri, options);
    }
  }

  /**
   * Gets the current account used to sign transactions
   * @return {Account} PolkadotJS Keyring account
   */
  getAccount() {
    return this.account;
  }


  /**
   * Check if the SDK has been given a keyring to sign
   * @returns {boolean}
   */
  hasKeyring() {
    return !!this._keyring;
  }

  /**
   * Sets the keyring
   * @param {keyring} keyring - PolkadotJS Keyring
   */
  async setKeyring(keyring, options) {
    if (keyring) {
      this._keyring = keyring;
    } else {
      this._keyring = new Keyring(options);
    }
  }

  /** TODO: Its name is inconsistent with other methods. It should be getKeyring
   * Gets the keyring
   * @return {Keyring} PolkadotJS Keyring
   */
  get keyring() {
    return this._keyring;
  }

  /**
   * Helper function to send transaction
   * @param {Extrinsic} extrinsic - Extrinsic to send
   * @param {bool} shouldUnsubscribe - Should we automatically unsubscribe from the transaction after its finalized
   * @return {Promise}
   */
  async sendTransaction(extrinsic, shouldUnsubscribe = true) {
    return new Promise((resolve, reject) => {
      const account = this.getAccount();
      let unsubFunc = null;
      try {
        extrinsic
          .signAndSend(account, ({events = [], status}) => {
            if (status.isFinalized) {
              if (shouldUnsubscribe && unsubFunc) {
                unsubFunc();
              }
              resolve(events, status);
            }
          })
          .catch(error => reject(error))
          .then(unsub => {
            unsubFunc = unsub;
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gets the SDK's DID module
   * @return {DIDModule} The module to use
   */
  get did() {
    return this._did;
  }

  /**
   * Gets the SDK's revocation module
   * @return {RevocationModule} The module to use
   */
  get revocation() {
    return this._revocation;
  }
}

export default new DockSDK();
export {
  DockSDK,
  DIDModule,
  RevocationModule,
  PublicKey,
  PublicKeySr25519,
  PublicKeyEd25519,
  PublicKeySecp256k1,
  Signature,
  SignatureSr25519,
  SignatureEd25519
};
