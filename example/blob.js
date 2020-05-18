import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToU8a, u8aToHex, u8aToString } from '@polkadot/util';

import { DockAPI } from '../src/api';
import { DockBlobByteSize } from '../src/modules/blob';
import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

async function writeAndReadBlob(dock, blobValue, dockDID, pair) {
  const blobId = randomAsHex(DockBlobByteSize);
  console.log('Writing blob with id ', blobId, 'and value', blobValue);

  const blob = {
    id: blobId,
    blob: blobValue,
    author: getHexIdentifierFromDID(dockDID),
  };

  await dock.sendTransaction(dock.blob.new(blob, pair), false);

  console.log('Blog written, reading from chain...');

  const chainBlob = await dock.blob.getBlob(blobId);
  return chainBlob;
}

async function main() {
  console.log('Connecting to the node...');
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  // Generate a DID to be used as author
  const dockDID = createNewDockDID();
  console.log('Creating new DID', dockDID);

  // Generate first key with this seed. The key type is Sr25519
  const pair = dock.keyring.addFromUri(randomAsHex(32));
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  await dock.sendTransaction(dock.did.new(dockDID, keyDetail));

  // Write blob as string
  const blobValue = u8aToHex(u8aToU8a('hello blob storage!'));
  const chainBlob = await writeAndReadBlob(dock, blobValue, dockDID, pair);
  const blobStrFromChain = u8aToString(chainBlob[1]);
  console.log('Resulting blob string from chain:', blobStrFromChain);

  // Write blob as array
  const blobValueArray = [1, 2, 3];
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
