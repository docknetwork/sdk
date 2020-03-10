// Import PolkadotJS keyring
import {Keyring} from '@polkadot/api';

// Import Dock SDK
import DockSDK, {DIDModule} from '../src/dock-sdk';

// Initialise Dock SDK
const dock = new DockSDK('ws://127.0.0.1:9944');
const did = '0x2bb29852687a7cbff311dc26e67451';

async function onDIDCreated() {
  console.log('Transaction finalized.');

  // Check if DID exists
  const result = await dock.did.get(did)
  console.log('DID:', result);
  process.exit();
}

// Called when connected to the node
async function onConnected() {
  const keyring = new Keyring({type: 'sr25519'});
  const account = keyring.addFromUri('//Alice', {name: 'Alice'});

  const controller = '0x666666666666666666666666666666';
  const publicKey = {
    Sr25519: '0x999999999999999999999999999999',
    Ed25519: undefined,
    Secp256k1: undefined,
  };

  console.log('Submitting new DID', did, controller, publicKey);

  const transaction = dock.did.new(did, controller, publicKey);
  dock.sendTransaction(account, transaction, onDIDCreated);
}

// Connect to the node and start working with it
dock.init()
  .then(onConnected);
