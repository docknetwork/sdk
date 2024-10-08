import {
  DockDid,
  DIDDocument,
  DidKey,
  VerificationRelationship,
  LinkedDomains,
  ServiceEndpoint,
} from '@docknetwork/credential-sdk/types';
import { DockAPI } from '@docknetwork/dock-blockchain-api';
import { DockDIDModule } from '@docknetwork/dock-blockchain-modules';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';

// DID will be generated randomly
const dockDID = DockDid.random();

const dock = new DockAPI();
const didModule = new DockDIDModule(dock);

// Generate first key with this seed. The key type is Sr25519
const firstKeyPair = Ed25519Keypair.random();

// Generate second key (for update) with this seed. The key type is Ed25519
const secondKeyPair = Ed25519Keypair.random();

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  // Sign the DID removal with this key pair as this is the current key of the DID
  const pair = new DidKeypair([dockDID, 1], firstKeyPair);

  return await didModule.removeDocument(dockDID, pair);
}

// This function assumes the DID has been written.
async function addServiceEndpoint() {
  console.log('Add new service endpoint now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = new DidKeypair([dockDID, 1], firstKeyPair);

  const newEndpoint = new ServiceEndpoint(new LinkedDomains(), [
    'https://foo.example.com',
  ]);
  const doc = await didModule.getDocument(dockDID);

  doc.addServiceEndpoint(
    `${dockDID}#linked-domain`,
    newEndpoint,
    dockDID,
    pair,
  );

  return await didModule.updateDocument(doc, pair);
}

// This function assumes the DID has been written.
async function addController() {
  console.log('Add new controller now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = new DidKeypair([dockDID, 1], firstKeyPair);

  const newController = DockDid.random();

  const doc = await didModule.getDocument(dockDID);

  doc.addController(newController);

  return await didModule.updateDocument(doc, pair);
}

// This function assumes the DID has been written.
async function addKey() {
  console.log('Add new key now.');

  // Sign key update with this key pair as this is the current key of the DID
  const pair = new DidKeypair([dockDID, 1], firstKeyPair);

  // Update DID key to the following
  const newPair = new DidKeypair([dockDID, 2], secondKeyPair);
  // the following function will figure out the correct PublicKey type from the `type` property of `newPair`
  const newPk = newPair.publicKey();

  const vr = new VerificationRelationship();
  vr.setAuthentication();
  const newDidKey = new DidKey(newPk, vr);

  const document = await didModule.getDocument(dockDID);

  document.addKey([dockDID, 2], newDidKey);

  return await didModule.updateDocument(document, pair);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await didModule.getDocument(dockDID);
  console.log('DID Document:', JSON.stringify(result, null, 2));
  return result;
}

// Called when connected to the node
async function registerNewDID() {
  // The controller is same as the DID
  const didKey = new DidKey(
    firstKeyPair.publicKey(),
    new VerificationRelationship(),
  );

  console.log('Submitting new DID', dockDID, firstKeyPair.publicKey());

  return await didModule.createDocument(DIDDocument.create(dockDID, [didKey]));
}

// Initialize Dock API, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
dock
  .init({
    address: [process.env.FullNodeEndpoint || 'ws://127.0.0.1:9944'],
  })
  .then(() => {
    const account = dock.keyring.addFromUri(
      process.env.TestAccountURI || '//Alice',
    );
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
      await didModule.getDocument(dockDID);
      throw new Error(
        'The call to get the DID document should have failed but did not fail. This means the remove DID call has not worked.',
      );
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
