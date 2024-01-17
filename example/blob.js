import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToString } from '@polkadot/util';

import { DockAPI } from '../src/index';
import { DockBlobIdByteSize } from '../src/modules/blob';
import { createNewDockDID, DidKeypair } from '../src/utils/did';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';
import { DidKey, VerificationRelationship } from '../src/public-keys';

async function writeAndReadBlob(dock, blobValue, dockDID, pair) {
  const blobId = randomAsHex(DockBlobIdByteSize);
  console.log('Writing blob with id ', blobId, 'and value', blobValue);

  const blob = {
    id: blobId,
    blob: blobValue,
  };

  await dock.blob.new(blob, dockDID, pair, { didModule: dock.did }, false);

  console.log('Blob written, reading from chain...');

  return dock.blob.get(blobId);
}

async function createAuthorDID(dock, pair) {
  // Generate a DID to be used as author
  const dockDID = createNewDockDID();
  console.log('Creating new author DID', dockDID);

  // Create an author DID to write with
  const publicKey = pair.publicKey();
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  await dock.did.new(dockDID, [didKey], [], false);
  return dockDID;
}

async function connectToNode() {
  console.log('Connecting to the node...');
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);
  return dock;
}

async function main() {
  // Connect to the node
  const dock = await connectToNode();

  // Generate keypair for DID
  const pair = DidKeypair.fromApi(dock);

  // Generate a DID to be used as author
  const dockDID = await createAuthorDID(dock, pair);

  // Write blob as json
  const blobValueJSON = { jsonStorage: true };
  const chainBlobJSON = await writeAndReadBlob(dock, blobValueJSON, dockDID, pair);
  const blobJSONFromChain = chainBlobJSON[1];
  console.log('Resulting blob JSON from chain:', blobJSONFromChain);

  // Write blob as string
  const blobValue = 'hello blob storage!';
  const chainBlob = await writeAndReadBlob(dock, blobValue, dockDID, pair);
  const blobStrFromChain = u8aToString(chainBlob[1]);
  console.log('Resulting blob string from chain:', blobStrFromChain);

  // Write blob as array
  const blobValueArray = new Uint8Array([1, 2, 3]);
  const chainBlobArray = await writeAndReadBlob(dock, blobValueArray, dockDID, pair);
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
