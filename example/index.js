// Import some utils from Polkadot JS
import {randomAsHex} from '@polkadot/util-crypto';
import {u8aToHex} from '@polkadot/util';

// Import Dock SDK
import dock from '../src/dock-sdk';
import {PublicKeySr25519, PublicKeyEd25519, SignatureSr25519, SignatureEd25519} from '../src/dock-sdk';

// Generate a random DID
const didIdentifier = randomAsHex(32);

// Generate first key with this seed. The key type is Sr25519
const firstKeySeed = randomAsHex(32);

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeySeed = randomAsHex(32);

// TODO: Better to change the names of the following functions to the actions that they do and
// not when the need to be done. We can document the order of their execution here.

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  // Get DID details. This call will fail if DID is not written already
  const last_modified_in_block = (await dock.did.getDetail(didIdentifier))[1];

  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

  const serializedDIDRemoval = dock.did.getSerializedDIDRemoval(didIdentifier, last_modified_in_block);
  const signature = new SignatureEd25519(u8aToHex(currentPair.sign(serializedDIDRemoval)));

  const transaction = dock.did.remove(didIdentifier, signature, last_modified_in_block);
  return dock.sendTransaction(transaction);
}

// This function assumes the DID has been written.
async function updateDIDKey() {
  console.log('Updating key now.');

  // Get DID details. This call will fail if DID is not written already
  const last_modified_in_block = (await dock.did.getDetail(didIdentifier))[1];
  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  // Update DID key to the following
  const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
  const newPk = new PublicKeyEd25519(u8aToHex(newPair.publicKey));
  const newController = randomAsHex(32);

  const serializedKeyUpdate = dock.did.getSerializedKeyUpdate(didIdentifier, newPk, last_modified_in_block, newController);
  const signature = new SignatureSr25519(u8aToHex(currentPair.sign(serializedKeyUpdate)));

  const transaction = dock.did.updateKey(didIdentifier, signature, newPk, last_modified_in_block, newController);
  return dock.sendTransaction(transaction);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  return dock.did.getDocument(didIdentifier).then(function (result) {
    console.log('DID Document:', JSON.stringify(result, true, 2));
  }).catch(error => {
    console.error('Error occured somewhere, it was caught!', error);
  });
}

// Called when connected to the node
async function createNewDID() {
  const controller = randomAsHex(32);

  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = new PublicKeySr25519(u8aToHex(firstPair.publicKey));

  console.log('Submitting new DID', didIdentifier, controller, publicKey);

  const transaction = dock.did.new(didIdentifier, controller, publicKey);
  return dock.sendTransaction(transaction);
}

// Initialise Dock SDK, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
dock.init('ws://127.0.0.1:9944')
  .then(createNewDID)
  .then(getDIDDoc)
  .then(updateDIDKey)
  .then(getDIDDoc)
  .then(removeDID)
  .then(getDIDDoc)
  .catch(error => {
    console.error('Error occured somewhere, it was caught!', error);
  });
