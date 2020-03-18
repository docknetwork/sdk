// Import crypto utils
import {randomAsHex} from '@polkadot/util-crypto';

// Import Dock SDK
import dock from '../src/dock-sdk';
import {PublicKeySr25519} from '../src/dock-sdk';

// Generate a random DID
const didIdentifier = randomAsHex(32);

async function onDIDCreated() {
  console.log('Transaction finalized.');

  // Check if DID exists
  const result = await dock.did.getDocument(didIdentifier);
  console.log('DID Document:', JSON.stringify(result, true, 2));
  process.exit();
}

// Called when connected to the node
async function onConnected() {
  const controller = randomAsHex(32);
  const publicKey = new PublicKeySr25519('0x9999999999999999999999999999999999999999999999999999999999999999');

  console.log('Submitting new DID', didIdentifier, controller, publicKey);

  const transaction = dock.did.new(didIdentifier, controller, publicKey);
  dock.sendTransaction(transaction)
    .then(onDIDCreated)
    .catch(error => {
      console.error('Error when sending transaction!', error);
    });
}

// // Initialise Dock SDK, connect to the node and start working with it
dock.init('ws://127.0.0.1:9944')
  .then(onConnected);
