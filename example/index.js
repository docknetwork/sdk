// Import some utils from Polkadot JS
import {randomAsHex} from '@polkadot/util-crypto';

// Import Dock SDK
import dock, {
  PublicKeySr25519,
  PublicKeyEd25519,
  SignatureSr25519,
  SignatureEd25519
} from '../src/dock-sdk';

const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';

// Generate a random DID
const didIdentifier = randomAsHex(32);

// Generate first key with this seed. The key type is Sr25519
const firstKeySeed = randomAsHex(32);

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeySeed = randomAsHex(32);

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  // Get DID details. This call will fail if DID is not written already
  const last_modified_in_block = (await dock.did.getDetail(didIdentifier))[1];

  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

  const serializedDIDRemoval = dock.did.getSerializedDIDRemoval(didIdentifier, last_modified_in_block);
  const signature = SignatureEd25519.sign(serializedDIDRemoval, currentPair);

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
  const newPk = PublicKeyEd25519.fromKeyringPair(newPair);
  const newController = randomAsHex(32);

  const serializedKeyUpdate = dock.did.getSerializedKeyUpdate(didIdentifier, newPk, last_modified_in_block, newController);
  const signature = SignatureSr25519.sign(serializedKeyUpdate, currentPair);

  const transaction = dock.did.updateKey(didIdentifier, signature, newPk, last_modified_in_block, newController);
  return dock.sendTransaction(transaction);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await dock.did.getDocument(didIdentifier);
  console.log('DID Document:', JSON.stringify(result, true, 2));
  return result;
}

// Called when connected to the node
function createNewDID() {
  const controller = randomAsHex(32);

  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = PublicKeySr25519.fromKeyringPair(firstPair);

  console.log('Submitting new DID', didIdentifier, controller, publicKey);

  const transaction = dock.did.new(didIdentifier, controller, publicKey);
  return dock.sendTransaction(transaction);
}

// Initialise Dock SDK, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
dock.init(fullNodeWsRPCEndpoint)
  .then(() => {
    const account = dock.keyring.addFromUri('//Alice', {name: 'Alice'});
    dock.setAccount(account);
    return createNewDID();
  })
  .then(getDIDDoc)
  .then(updateDIDKey)
  .then(getDIDDoc)
  .then(removeDID)
  .then(getDIDDoc)
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
  });
