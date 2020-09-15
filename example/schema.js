import { randomAsHex } from '@polkadot/util-crypto';
import Schema from '../src/modules/schema';

import { DockAPI } from '../src/api';
import { createNewDockDID, createKeyDetail } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import VerifiableCredential from '../src/verifiable-credential';

import { UniversalResolver } from '../src/resolver';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

import exampleCredential from '../tests/example-credential';

async function createAuthorDID(dock, pair) {
  // Generate a DID to be used as author
  const dockDID = createNewDockDID();
  console.log('Creating new author DID', dockDID);

  // Create an author DID to write with
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  await dock.did.new(dockDID, keyDetail, false);
  return dockDID;
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

  // Generate first key with this seed. The key type is Sr25519
  const pair = dock.keyring.addFromUri(randomAsHex(32));

  // Generate a DID to be used as author
  const dockDID = await createAuthorDID(dock, pair);

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

  // Set schema author
  schema.setAuthor(dockDID);

  // Sign the schema
  schema.sign(pair, dock.blob);

  console.log('The schema is:', JSON.stringify(schema.toJSON(), null, 2));
  console.log('Writing schema to the chain with blob id of', schema.id, '...');

  await schema.writeToChain(dock, pair, undefined, false);

  console.log(`Schema written, reading from chain (${schema.id})...`);

  const result = await Schema.get(schema.id, dock);
  console.log('Result from chain:', result);

  console.log('Creating a verifiable credential and assigning its schema...');
  const vc = VerifiableCredential.fromJSON(exampleCredential);
  vc.setSchema(result.id, 'JsonSchemaValidator2018');

  const universalResolverUrl = 'https://uniresolver.io';
  const resolver = new UniversalResolver(universalResolverUrl);

  console.log('Verifying the credential:', vc);
  await vc.verify({
    resolver,
    compactProof: false,
    forceRevocationCheck: false,
    revocationApi: { dock },
    schemaApi: { dock },
  });

  console.log('Credential verified, mutating the subject and trying again...');
  vc.addSubject({
    id: 'uuid:0x0',
    thisWillFail: true,
  });

  try {
    await vc.verify({
      resolver,
      compactProof: false,
      forceRevocationCheck: false,
      revocationApi: { dock },
      schemaApi: { dock },
    });
    throw new Error('Verification succeeded, but it shouldn\'t have. This is a bug.');
  } catch (e) {
    console.log('Verification failed as expected:', e);
  }

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
