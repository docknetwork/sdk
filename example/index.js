// Import PolkadotJS keyring
import {Keyring} from '@polkadot/api';

// Import Dock SDK
import dock from '../src/dock-sdk';
import {PublicKey} from '../src/dock-sdk';

// Initialise Dock SDK
const didIdentifier = '0x2bb29852687a7cbff311dc26e67451332bb29852687a7cbff311dc26e6745133';

async function onDIDCreated() {
  console.log('Transaction finalized.');

  // Check if DID exists
  const result = await dock.did.getDocument(didIdentifier);
  console.log('DID Document:', JSON.stringify(result, true, 2));
  process.exit();
}

// Called when connected to the node
async function onConnected() {
  const keyring = new Keyring({type: 'sr25519'});
  const account = keyring.addFromUri('//Alice', {name: 'Alice'});

  const controller = '0x6666666666666666666666666666666666666666666666666666666666666666';
  const publicKey = PublicKey.newSr25519('0x9999999999999999999999999999999999999999999999999999999999999999');


  console.log('Submitting new DID', didIdentifier, controller, publicKey);

  const transaction = dock.did.new(didIdentifier, controller, publicKey);
  dock.sendTransaction(account, transaction, onDIDCreated);
}

// Connect to the node and start working with it
dock.init('ws://127.0.0.1:9944')
  .then(onConnected);
