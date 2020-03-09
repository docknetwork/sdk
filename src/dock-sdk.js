import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import DID from './modules/did';

// Define custom types
const types = {
  "DID": "[u8;32]",
  "Bytes32": {
    "value": "[u8;32]"
  },
  "Bytes33": {
    "value": "[u8;33]"
  },
  "PublicKey": {
    "_enum": {
      "Sr25519": "Bytes32",
      "Ed25519": "Bytes32",
      "Secp256k1": "Bytes33"
    }
  },
  "KeyDetail": {
    "controller": "DID",
    "public_key": "PublicKey"
  },
  "KeyUpdate": {
    "did": "DID",
    "public_key": "PublicKey",
    "controller": "Option<DID>",
    "last_modified_in_block": "u64"
  },
  "DIDRemoval": {
    "did": "DID",
    "last_modified_in_block": "u64"
  }
};

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

    this.api = await ApiPromise.create({
      provider,
      types,
    });

    this.did = new DID(this.api);

    return cryptoWaitReady();
  }

  // Helper function to send transaction
  // TODO: refactor into a promise not oncomplete callback and fix error handling
  // throw a promise error if transaction failed
  async sendTransaction(account, transfer, onComplete) {
    const unsub = await transfer
      .signAndSend(account, ({events = [], status}) => {
        console.log(`Current status is ${status.type}`, status);

        if (status.isFinalized) {
          console.log(
            `Transaction included at blockHash ${status.asFinalized}`
          );

          // Loop through Vec<EventRecord> to display all events
          events.forEach(({phase, event: {data, method, section}}) => {
            console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
          });

          unsub();

          if (onComplete) {
            onComplete();
          }
        }
      })
    .catch(error => {
      console.error('error', error)
    });
  }
}

export const DIDModule = DID;
export default DockSDK;
