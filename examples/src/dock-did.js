import {
  CheqdDid,
  DIDDocument,
  DidKey,
  VerificationRelationship,
  LinkedDomains,
  ServiceEndpoint,
} from '@docknetwork/credential-sdk/types';
import { CheqdAPI } from '@docknetwork/cheqd-blockchain-api';
import { CheqdDIDModule } from '@docknetwork/cheqd-blockchain-modules';
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';
import { faucet, network, url } from './env.js';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.

// DID will be generated randomly
const cheqdDID = CheqdDid.random(network);
const controllerDID = CheqdDid.random(network);

const cheqd = new CheqdAPI();
const didModule = new CheqdDIDModule(cheqd);

// Generate first key with this seed. The key type is Sr25519
const didPair = new DidKeypair([cheqdDID, 1], Ed25519Keypair.random());

// Generate second key (for update) with this seed. The key type is Ed25519
const controllerPair = new DidKeypair(
  [controllerDID, 1],
  Ed25519Keypair.random(),
);

// This function assumes the DID has been written.
async function removeDID() {
  console.log('Removing DID now.');

  return await didModule.removeDocument(cheqdDID, [didPair, controllerPair]);
}

// This function assumes the DID has been written.
async function addServiceEndpoint() {
  console.log('Add new service endpoint now.');

  const newEndpoint = new ServiceEndpoint(new LinkedDomains(), [
    'https://foo.example.com',
  ]);

  // Example of using the new DIDCommMessaging service type
  const didCommEndpoint = new ServiceEndpoint('DIDCommMessaging', [
    {
      uri: 'https://example.com/path1',
    },
  ]);

  console.log('LinkedDomains endpoint type:', newEndpoint.types.constructor.name);
  console.log('DIDCommMessaging endpoint type:', didCommEndpoint.types.constructor.name);
  console.log('LinkedDomains endpoint toJSON:', newEndpoint.types.toJSON());
  console.log('DIDCommMessaging endpoint toJSON:', didCommEndpoint.types.toJSON());

  const doc = await didModule.getDocument(cheqdDID);

  doc.addServiceEndpoint(`${cheqdDID}#linked-domain`, newEndpoint);
  doc.addServiceEndpoint(`${cheqdDID}#didcomm`, didCommEndpoint);

  return await didModule.updateDocument(doc, [didPair, controllerPair]);
}

// This function assumes the DID has been written.
async function addController() {
  console.log('Add new controller now.');

  await didModule.createDocument(
    DIDDocument.create(controllerDID, [controllerPair.didKey()]),
    controllerPair,
  );

  const doc = await didModule.getDocument(cheqdDID);

  doc.addController(controllerDID);

  return await didModule.updateDocument(doc, [didPair, controllerPair]);
}

// This function assumes the DID has been written.
async function addKey() {
  console.log('Add new key now.');

  // Update DID key to the following
  const newPair = new DidKeypair([cheqdDID, 2], Ed25519Keypair.random());
  // the following function will figure out the correct PublicKey type from the `type` property of `newPair`
  const newPk = newPair.publicKey();

  const vr = new VerificationRelationship();
  vr.setAuthentication();
  const newDidKey = new DidKey(newPk, vr);

  const document = await didModule.getDocument(cheqdDID);

  document.addKey([cheqdDID, 2], newDidKey);

  return await didModule.updateDocument(document, didPair);
}

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await didModule.getDocument(cheqdDID);
  console.log('DID Document:', JSON.stringify(result, null, 2));
  return result;
}

// Called when connected to the node
async function registerNewDID() {
  console.log('Submitting new DID', cheqdDID, didPair.publicKey());

  return await didModule.createDocument(
    DIDDocument.create(cheqdDID, [didPair.didKey()]),
    didPair,
  );
}

// Initialize Dock API, connect to the node and start working with it
// It will create a new DID with a key, then update the key to another one and then remove the DID
faucet
  .wallet()
  .then((wallet) => cheqd.init({
    url,
    wallet,
    network,
  }))
  .then(() => registerNewDID())
  .then(getDIDDoc)
  .then(addKey)
  .then(getDIDDoc)
  .then(addController)
  .then(addServiceEndpoint)
  .then(getDIDDoc)
  .then(removeDID)
  .then(async () => {
    try {
      await didModule.getDocument(cheqdDID);
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
