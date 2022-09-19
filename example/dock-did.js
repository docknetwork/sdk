// Import some utils from Polkadot JS
import { randomAsHex } from '@polkadot/util-crypto';

// Import Dock API
import { u8aToHex } from '@polkadot/util';
import dock, {
  PublicKeySr25519,
} from '../src/index';
import {
  createNewDockDID,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';
import { DidKey, VerificationRelationship } from '../src/public-keys';
import { ServiceEndpointType } from '../src/modules/did/service-endpoint';

// DID will be generated randomly
const dockDID = createNewDockDID();

// Generate first key with this seed. The key type is Sr25519
const firstKeySeed = randomAsHex(32);

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeySeed = randomAsHex(32);

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  // Sign the DID removal with this key pair as this is the current key of the DID
  const pair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  return dock.did.remove(dockDID, dockDID, pair, 1, undefined, false);
}

// This function assumes the DID has been written.
async function addServiceEndpoint() {
  console.log('Add new service endpoint now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  const spType = new ServiceEndpointType();
  spType.setLinkedDomains();
  const encoder = new TextEncoder();
  const spIdText = `${dockDID}#linked-domain`;
  const spId = u8aToHex(encoder.encode(spIdText));
  const originsText = ['https://foo.example.com'];
  const origins = originsText.map((u) => u8aToHex(encoder.encode(u)));
  return dock.did.addServiceEndpoint(spId, spType, origins, dockDID, dockDID, pair, 1, undefined, false);
}

// This function assumes the DID has been written.
async function addController() {
  console.log('Add new controller now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  const newController = createNewDockDID();

  return dock.did.addControllers([newController], dockDID, dockDID, pair, 1, undefined, false);
}

// This function assumes the DID has been written.
async function addKey() {
  console.log('Add new key now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

  // Update DID key to the following
  const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
  // the following function will figure out the correct PublicKey type from the `type` property of `newPair`
  const newPk = getPublicKeyFromKeyringPair(newPair);

  const vr = new VerificationRelationship();
  vr.setAuthentication();
  const newDidKey = new DidKey(newPk, vr);

  return dock.did.addKeys([newDidKey], dockDID, dockDID, pair, 1, undefined, false);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await dock.did.getDocument(dockDID);
  console.log('DID Document:', JSON.stringify(result, null, 2));
  return result;
}

// Called when connected to the node
function registerNewDID() {
  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = PublicKeySr25519.fromKeyringPair(firstPair);

  // The controller is same as the DID
  const didKey = new DidKey(publicKey, new VerificationRelationship());

  console.log('Submitting new DID', dockDID, publicKey);

  return dock.did.new(dockDID, [didKey], [], false);
}

// Initialize Dock API, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    return registerNewDID();
  })
  .then(getDIDDoc)
  .then(addKey)
  .then(getDIDDoc)
  .then(addController)
  .then(addServiceEndpoint)
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
