// Import PolkadotJS
import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';

// Import Dock SDK
import DockSDK, {DIDModule} from '../src/dock-sdk';

console.log('DockSDK', DockSDK)
console.log('DIDModule', DIDModule)

// Initialise address and providers
const nodeAddress = 'ws://127.0.0.1:9944';
const provider = new WsProvider(nodeAddress);
const keyring = new Keyring({type: 'sr25519'});

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

async function connectToNode() {
  // Create the API and wait until ready
  const api = await ApiPromise.create({
    provider,
    types,
  });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  console.log('chain', chain)
  console.log('nodeName', nodeName)
  console.log('nodeVersion', nodeVersion)
}

// Connect to node
connectToNode();
