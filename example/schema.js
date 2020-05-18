import Schema from '../src/modules/schema';
import { validateCredentialSchema } from '../src/utils/vc';
import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToU8a, u8aToString, u8aToHex } from '@polkadot/util';

import { DockAPI } from '../src/api';
import { DockBlobByteSize } from '../src/modules/blob';
import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

async function main() {
  // Generate aDID to be used as author
  const dockDID = createNewDockDID();

  console.log('Connecting to the node...');
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  console.log('Creating a new schema...');
  const schema = new Schema();
  await schema.setJSONSchema({
    $schema: 'http://json-schema.org/draft-07/schema#',
    description: 'Dock Schema Example',
    type: 'object',
    properties: {
      id: {
        type: 'string',
      },
      emailAddress: {
        type: 'string',
        format: 'email',
      },
      alumniOf: {
        type: 'string',
      },
    },
    required: ['emailAddress', 'alumniOf'],
    additionalProperties: false,
  });

  // Set schema name and author
  schema
    .setName('Example Schema')
    .setAuthor(dockDID);

  // TODO: Sign the schema
  // schema.sign(msg, account);

  console.log('The schema is:', schema.toJSON());

  console.log('Creating new DID', dockDID);

  // Generate first key with this seed. The key type is Sr25519
  const pair = dock.keyring.addFromUri(randomAsHex(32));

  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  await dock.sendTransaction(dock.did.new(dockDID, keyDetail));

  const blobId = randomAsHex(DockBlobByteSize);
  const blobStr = JSON.stringify(schema.toJSON());

  console.log('Writing schema to the chain with blob id of', blobId, '...');

  await dock.sendTransaction(dock.blob.new({
      id: blobId,
      blob: u8aToU8a(blobStr),
      author: getHexIdentifierFromDID(dockDID),
    }, pair
  ), false);

  console.log('Blog written, reading from chain...');

  const result = await Schema.getSchema(blobId, dock);
  console.log('Result from chain:', result);

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
