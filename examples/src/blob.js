import { CheqdAPI } from '@docknetwork/dock-blockchain-api';
import { CheqdCoreModules } from '@docknetwork/dock-blockchain-modules';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {
  DidKey,
  VerificationRelationship,
  CheqdBlobId,
  CheqdDid,
  DIDDocument,
} from '@docknetwork/credential-sdk/types';
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';
import { network } from './env.js';

async function writeAndReadBlob(blobModule, blobValue, did, pair) {
  const blobId = CheqdBlobId.random();
  console.log('Writing blob with id ', blobId, 'and value', blobValue);

  const blob = {
    id: blobId,
    blob: blobValue,
  };

  await blobModule.new(blob, pair);

  console.log('Blob written, reading from chain...');

  return await blobModule.get(blobId);
}

async function createAuthorDID(didModule, pair) {
  // Generate a DID to be used as author
  const dockDID = CheqdDid.random(network);
  console.log('Creating new author DID', dockDID);

  // Create an author DID to write with
  const publicKey = pair.publicKey();
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  await didModule.createDocument(DIDDocument.create(dockDID, [didKey]));

  return dockDID;
}

async function connectToNode() {
  console.log('Connecting to the node...');
  const dock = new CheqdAPI();
  await dock.init({
    address: process.env.FullNodeEndpoint || 'ws://127.0.0.1:9944',
  });

  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(
    process.env.TestAccountURI || '//Alice',
  );
  dock.setAccount(account);
  return dock;
}

async function main() {
  // Connect to the node
  const dock = await connectToNode();
  const modules = new CheqdCoreModules(dock);

  const keyPair = Ed25519Keypair.random();

  // Generate a DID to be used as author
  const dockDID = await createAuthorDID(modules.did, keyPair);

  // Generate keypair for DID
  const pair = new DidKeypair([dockDID, 1], keyPair);

  // Write blob as json
  const blobValueJSON = { jsonStorage: true };
  const chainBlobJSON = await writeAndReadBlob(
    modules.blob,
    blobValueJSON,
    dockDID,
    pair,
  );
  const blobJSONFromChain = chainBlobJSON[1];
  console.log('Resulting blob JSON from chain:', blobJSONFromChain);

  // Write blob as string
  const blobValue = 'hello blob storage!';
  const chainBlob = await writeAndReadBlob(
    modules.blob,
    blobValue,
    dockDID,
    pair,
  );
  const blobStrFromChain = chainBlob[1].toString();
  console.log('Resulting blob string from chain:', blobStrFromChain);

  // Write blob as array
  const blobValueArray = new Uint8Array([1, 2, 3]);
  const chainBlobArray = await writeAndReadBlob(
    modules.blob,
    blobValueArray,
    dockDID,
    pair,
  );
  const blobArrayFromChain = chainBlobArray[1];
  console.log('Resulting blob array from chain:', blobArrayFromChain);

  // Finalize
  console.log('All done, disconnecting...');
  await dock.disconnect();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
