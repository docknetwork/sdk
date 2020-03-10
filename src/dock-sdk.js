import {ApiPromise, WsProvider} from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import DID from './modules/did';
import types from './types.json';

/** Helper class to interact with the Dock chain */
class DockSDK {
  /**
   * Skeleton constructor, does nothing yet
   * @constructor
   * @param {string} address - WebSocket Address
   */
  constructor(address) {
    this.address = address;
  }

  async init() {
    const provider = new WsProvider(this.address);

    console.log('typestypestypes', types)

    this.api = await ApiPromise.create({
      provider,
      types,
    });

    this.did = new DID(this.api);

    return cryptoWaitReady();
  }

  /**
   * Helper function to send transaction
   * @param {Account} account - Keyring Account
   * @param {Extrinsic} transfer - Extrinsic to send
   * @param {function} onComplete - On complete callback, temporary
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async sendTransaction(account, transfer, onComplete) {
    // TODO: refactor into a promise not oncomplete callback and fix error handling, throw a promise error if transaction failed
    const unsub = await transfer
      .signAndSend(account, ({events = [], status}) => {
        // console.log(`Current status is ${status.type}`, status);

        if (status.isFinalized) {
          // console.log(
          //   `Transaction included at blockHash ${status.asFinalized}`
          // );

          // Loop through Vec<EventRecord> to display all events
          // events.forEach(({phase, event: {data, method, section}}) => {
          // console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
          // });

          unsub();

          if (onComplete) {
            onComplete(events);
          }
        }
      })
      .catch(error => {
        throw 'error ' + error;
        // console.error('error', error);
      });
  }
}

export const DIDModule = DID;
export default DockSDK;
