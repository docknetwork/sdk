// Import PolkadotJS
import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

// Import Dock SDK
import DockSDK, {DIDModule} from '../src/dock-sdk';

console.log('DockSDK', DockSDK)
console.log('DIDModule', DIDModule)

// Initialise address and providers
const nodeAddress = 'ws://127.0.0.1:9944';

let account;

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

async function sendTransaction(transfer) {
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
      }
    })
  .catch(error => {
    console.error('error', error)
  });
}

async function connectToNode() {
  // Create the API and wait until ready
  const api = await ApiPromise.create({
    provider,
    types,
  });

  const provider = new WsProvider(nodeAddress);
  const keyring = new Keyring({type: 'sr25519'});
  account = keyring.addFromUri('//Alice', {name: 'Alice'});

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  console.log('chain', chain)
  console.log('nodeName', nodeName)
  console.log('nodeVersion', nodeVersion)

  // https://polkadot.js.org/apps/#/toolbox/hash
  const did = '0x2bb29852687a7cbff311dc26e674e78113e21402c93d3e097df8093d2d9d6bbd'; // my hashed data
  const detail = {
    controller: did,
    public_key: {
      Sr25519: '0x36a60ae463cb926dfefbdf5f82cf79d1f54dbecd8c44f69205bb09a8421fe632', // my public key
      Ed25519: undefined,
      Secp256k1: undefined,
    }
  };

  sendTransaction(api.tx.didModule.new(did, detail));
}

// Wait for crypto
cryptoWaitReady();

// Connect to node
connectToNode();
