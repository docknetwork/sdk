import { randomAsHex } from '@docknetwork/credential-sdk/utils';

import { DockAPI } from '@docknetwork/dock-blockchain-api';
import {
  DockDid,
  DIDDocument,
  DidKey,
  VerificationRelationship,
} from '@docknetwork/credential-sdk/types';
import { Schema } from '@docknetwork/credential-sdk/modules';
import { DockCoreModules } from '@docknetwork/dock-blockchain-modules';
import {
  VerifiableCredential,
  getKeyDoc,
} from '@docknetwork/credential-sdk/vc';
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';

import {
  UniversalResolver,
  DockResolver,
  WildcardMultiResolver,
} from '@docknetwork/credential-sdk/resolver';

const dock = new DockAPI();
const modules = new DockCoreModules(dock);
const blobModule = modules.blob;
const didModule = modules.did;

async function createDID(did, pair) {
  console.log('Creating new author DID', did);

  // Create an author DID to write with
  const publicKey = pair.publicKey();
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  await didModule.createDocument(DIDDocument.create(did, [didKey]));
}

async function main() {
  console.log('Connecting to the node...');
  await dock.init({
    address: process.env.FullNodeEndpoint || 'ws://127.0.0.1:9944',
  });

  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(
    process.env.TestAccountURI || '//Alice',
  );
  dock.setAccount(account);

  const keySeed = randomAsHex(32);
  const subjectKeySeed = randomAsHex(32);

  // Generate a DID to be used as author
  const dockDID = DockDid.random();
  // Generate first key with this seed. The key type is Ed25519
  const pair = new DidKeypair([dockDID, 1], new Ed25519Keypair(keySeed));
  await createDID(dockDID, pair);

  // Properly format a keyDoc to use for signing
  const keyDoc = getKeyDoc(dockDID, pair);

  const subjectDID = DockDid.random();
  const subjectPair = new DidKeypair(
    [subjectDID, 1],
    new Ed25519Keypair(subjectKeySeed),
  );
  await createDID(subjectDID, subjectPair);

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

  console.log('The schema is:', JSON.stringify(schema.toJSON(), null, 2));
  console.log('Writing schema to the chain with blob id of', schema.id, '...');

  await schema.writeToChain(blobModule, dockDID, pair);

  console.log(`Schema written, reading from chain (${schema.id})...`);

  const result = await Schema.get(schema.id, blobModule);
  console.log('Result from chain:', result);

  const universalResolverUrl = 'https://uniresolver.io';
  const resolver = new WildcardMultiResolver([
    new DockResolver(modules),
    new UniversalResolver(universalResolverUrl),
  ]);

  console.log('Creating a verifiable credential and assigning its schema...');
  const vc = new VerifiableCredential('https://example.com/credentials/187');
  vc.setSchema(result.id, 'JsonSchemaValidator2018');
  vc.addContext('https://www.w3.org/2018/credentials/examples/v1');
  vc.addContext({
    emailAddress: 'https://schema.org/email',
    alumniOf: 'https://schema.org/alumniOf',
  });
  vc.addType('AlumniCredential');
  vc.addSubject({
    id: String(subjectDID),
    alumniOf: 'Example University',
    emailAddress: 'abc@example.com',
  });
  await vc.sign(keyDoc);

  console.log('Verifying the credential:', vc);
  const { verified, error } = await vc.verify({
    resolver,
    compactProof: false,
  });
  if (!verified) {
    throw error || new Error('Verification failed');
  }

  console.log('Credential verified, mutating the subject and trying again...');
  vc.addSubject({
    id: 'uuid:0x0',
    thisWillFail: true,
  });

  try {
    await vc.verify({
      resolver,
      compactProof: false,
    });
    throw new Error(
      "Verification succeeded, but it shouldn't have. This is a bug.",
    );
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
