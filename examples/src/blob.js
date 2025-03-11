import { CheqdAPI } from '@docknetwork/cheqd-blockchain-api';
import { CheqdCoreModules } from '@docknetwork/cheqd-blockchain-modules';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {
  CheqdBlobId,
  CheqdDid,
  DIDDocument,
} from '@docknetwork/credential-sdk/types';
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';
import { faucet, network, url } from './env.js';

async function writeAndReadBlob(blobModule, did, blobValue, pair) {
  const blobId = CheqdBlobId.random(did);
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
  const kp = new DidKeypair([dockDID, 1], pair);

  // Create an author DID to write with
  await didModule.createDocument(
    DIDDocument.create(dockDID, [kp.didKey()]),
    kp,
  );

  return [dockDID, kp];
}

async function connectToNode() {
  console.log('Connecting to the node...');

  return await new CheqdAPI().init({
    url,
    wallet: await faucet.wallet(),
    network,
  });
}

async function main() {
  // Connect to the node
  const cheqd = await connectToNode();
  const modules = new CheqdCoreModules(cheqd);

  const keyPair = Ed25519Keypair.random();

  // Generate a DID to be used as author
  const [cheqdDID, pair] = await createAuthorDID(modules.did, keyPair);

  // Write blob as json
  const blobValueJSON = { jsonStorage: true };
  const chainBlobJSON = await writeAndReadBlob(
    modules.blob,
    cheqdDID,
    blobValueJSON,
    pair,
  );
  const blobJSONFromChain = chainBlobJSON[1];
  console.log('Resulting blob JSON from chain:', blobJSONFromChain);

  // Write blob as string
  const blobValue = 'hello blob storage!';
  const chainBlob = await writeAndReadBlob(
    modules.blob,
    cheqdDID,
    blobValue,
    pair,
  );
  const blobStrFromChain = chainBlob[1].toString();
  console.log('Resulting blob string from chain:', blobStrFromChain);

  // Write blob as array
  const blobValueArray = new Uint8Array([1, 2, 3]);
  const chainBlobArray = await writeAndReadBlob(
    modules.blob,
    cheqdDID,
    blobValueArray,
    pair,
  );
  const blobArrayFromChain = chainBlobArray[1];
  console.log('Resulting blob array from chain:', blobArrayFromChain);

  // Finalize
  console.log('All done, disconnecting...');
  await cheqd.disconnect();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
