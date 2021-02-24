// Import some utils from Polkadot JS
import { randomAsHex } from '@polkadot/util-crypto';

// Import Dock API
import dock, {
  PublicKeySr25519,
} from '../src/api';
import {
  createNewDockDID, createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

// DID will be generated randomly
// const dockDID = createNewDockDID();
const dockDID = '0x99671527b075a2218a6acf3ea891dc277999c90bd2ccd69921529bf59ec6785d';

// Generate first key with this seed. The key type is Sr25519
// const firstKeySeed = randomAsHex(32);
const firstKeySeed = '//Lovesh';

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeySeed = randomAsHex(32);

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  // Sign the DID removal with this key pair as this is the current key of the DID
  const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

  const [didRemoval, signature] = await createSignedDidRemoval(dock.did, dockDID, currentPair);

  return dock.did.remove(didRemoval, signature, false);
}

// This function assumes the DID has been written.
async function updateDIDKey() {
  console.log('Updating key now.');

  // Sign key update with this key pair as this is the current key of the DID
  const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  // Update DID key to the following
  const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
  // the following function will figure out the correct PublicKey type from the `type` property of `newPair`
  const newPk = getPublicKeyFromKeyringPair(newPair);

  const newController = randomAsHex(32);

  const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, dockDID, newPk, currentPair, newController);
  return dock.did.updateKey(keyUpdate, signature, false);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await dock.did.getDocument(dockDID);
  console.log('DID Document:', JSON.stringify(result, null, 2));
  process.exit(0);
  return result;
}

// Called when connected to the node
function registerNewDID() {
  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = PublicKeySr25519.fromKeyringPair(firstPair);

  // The controller is same as the DID
  const keyDetail = createKeyDetail(publicKey, dockDID);

  console.log('Submitting new DID', dockDID, publicKey);

  return dock.did.new(dockDID, keyDetail, false);
}

// Initialize Dock API, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    console.log(`Using ${TestAccountURI}`);
    const account = dock.keyring.addFromUri('super hope entire section nice student copy cotton oven aware water note');
    dock.setAccount(account);
    return registerNewDID();
  })
  .then(getDIDDoc)
  .then(updateDIDKey)
  .then(getDIDDoc)
  .then(removeDID)
  .then(async () => {
    try {
      await dock.did.getDocument(dockDID);
      throw new Error('The call to get the DID document should have failed but did not fail. This means the remove DID call has not worked.');
    } catch (e) {
      // The call to get the DID document has failed since the DID has been removed
      console.log('Example ran successfully');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
