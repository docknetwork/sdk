// Import PolkadotJS keyring
import {Keyring} from '@polkadot/api';

// Import some utils from Polkadot JS
import {randomAsHex} from '@polkadot/util-crypto';
import {u8aToHex, hexToU8a} from '@polkadot/util';

// Import Dock SDK
import dock from '../src/dock-sdk';
import {PublicKeySr25519, PublicKeyEd25519, SignatureSr25519} from '../src/dock-sdk';

const globalKeyring = new Keyring({ type: 'sr25519' });

// The script will create a new DID with a key, then update the key to another one and then remove the DID

// Generate a random DID
const didIdentifier = randomAsHex(32);

// Generate first key with this seed. The key type is Sr25519
const firstKeySeed = randomAsHex(32);

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeySeed = randomAsHex(32);

// TODO: Better to change the names of the following functions to the actions that they do and
// not when the need to be done. We can document the order of their execution here.

// This function assumes the DID has been written.
async function postDIDKeyUpdated() {
  console.log('Removing DID now.');
  //const keyring2 = new Keyring({type: 'sr25519'});
  const account = globalKeyring.addFromUri('//Bob', {name: 'Bob'});

  // Get DID details. This call will fail if DID is not written already
  const resp = await dock.did.getDetail(didIdentifier);
  const last_modified_in_block = resp[1];

  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = globalKeyring.addFromUri(firstKeySeed, null, 'sr25519');

  const serializedDIDRemoval = dock.did.getSerializedDIDRemoval(didIdentifier, last_modified_in_block);
  console.log(last_modified_in_block);
  const signature = new SignatureSr25519(u8aToHex(currentPair.sign(serializedDIDRemoval)));

  const transaction = dock.did.remove(didIdentifier, signature, last_modified_in_block);
  dock.sendTransaction(account, transaction, async function () {
    await onDIDCreated();
    process.exit();
  });

  //process.exit();
}

// This function assumes the DID has been written.
async function postDIDWritten() {
  console.log('Updating key now.');

  const account = globalKeyring.addFromUri('//Bob', {name: 'Bob'});

  // Get DID details. This call will fail if DID is not written already
  const last_modified_in_block = await dock.did.getDetail(didIdentifier)[1];

  //const keyring = new Keyring();
  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = globalKeyring.addFromUri(firstKeySeed, null, 'sr25519');

  // Update DID key to the following
  const newPair = globalKeyring.addFromUri(secondKeySeed, null, 'sr25519');
  const newPk = new PublicKeyEd25519(u8aToHex(newPair.publicKey));
  const newController = randomAsHex(32);

  const serializedKeyUpdate = dock.did.getSerializedKeyUpdate(didIdentifier, newPk, last_modified_in_block, newController);
  const signature = new SignatureSr25519(u8aToHex(currentPair.sign(serializedKeyUpdate)));

  console.log('Submitting key update');

  const transaction = dock.did.updateKey(didIdentifier, signature, newPk, last_modified_in_block, newController);
  //console.log(transaction);
  dock.sendTransaction(account, transaction, postDIDKeyUpdated);
}

async function onDIDCreated() {
  console.log('Transaction finalized.');

  // Check if DID exists
  const result = await dock.did.getDocument(didIdentifier);
  console.log('DID Document:', JSON.stringify(result, true, 2));
  await postDIDWritten();
}

// Called when connected to the node
async function onConnected() {
  //const keyring = new Keyring({type: 'sr25519'});
  const account = globalKeyring.addFromUri('//Alice', {name: 'Alice'});

  const controller = randomAsHex(32);

  const firstPair = globalKeyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = new PublicKeySr25519(u8aToHex(firstPair.publicKey));

  console.log('Submitting new DID', didIdentifier, controller, publicKey);

  const transaction = dock.did.new(didIdentifier, controller, publicKey);
  return dock.sendTransaction(transaction);
}

// // Initialise Dock SDK, connect to the node and start working with it
dock.init('ws://127.0.0.1:9944')
  .then(onConnected)
  .then(onDIDCreated)
  .catch(error => {
    console.error('Error occured somewhere, it was caught!', error);
  });
