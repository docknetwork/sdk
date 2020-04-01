import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import {cryptoWaitReady} from '@polkadot/util-crypto';

import RevocationModule from './modules/revocation';
import DIDModule from './modules/did';
import types from './types.json';
import VerifiableCredentialModule from './modules/vc';

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
class DockAPI {
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
  async init({address, keyring} = {}) {
    if (this.api) {
      throw new Error('API is already connected');
    }

    this.address = address || this.address;

    this.api = await ApiPromise.create({
      provider: new WsProvider(this.address),
      types,
    });

    this._did = new DIDModule(this.api);
    this._revocation = new RevocationModule(this.api);
    this._vc = new VerifiableCredentialModule();

    await cryptoWaitReady();

    if (!this._keyring || keyring) {
      this._keyring = new Keyring(keyring || {type: 'sr25519'});
    }

    return this.api;
  }

  async disconnect() {
    if (this.api) {
      await this.api.disconnect();
      delete this.api;
      delete this._did;
      delete this._revocation;
    }
  }

  isInitialized() {
    return !!this.api;
  }

  /** TODO: Should probably use set/get and rename account to _account
   * Sets the account used to sign transactions
   * @param {Account} account - PolkadotJS Keyring account
   */
  setAccount(account) {
    this.account = account;
  }

  /**
   * Gets the current account used to sign transactions
   * @return {Account} PolkadotJS Keyring account
   */
  getAccount() {
    return this.account;
  }

  /**
   * Sets the keyring
   * @param {keyring} keyring - PolkadotJS Keyring
   */
  set keyring(keyring) {
    this._keyring = keyring;
  }

  /**
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
    if (!this._did) {
      throw new Error('Unable to get DID module, SDK is not initialised');
    }
    return this._did;
  }

  /**
   * Gets the SDK's revocation module
   * @return {RevocationModule} The module to use
   */
  get revocation() {
    if (!this._revocation) {
      throw new Error('Unable to get revocation module, SDK is not initialised');
    }
    return this._revocation;
  }

  /**
   * Gets the SDK's Verifiable Credential module
   * @return {VerifiableCredentialModule} The module to use
   */
  get vc() {
    return this._vc;
  }
}

export default new DockAPI();
export {
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
  VerifiableCredentialModule
};
