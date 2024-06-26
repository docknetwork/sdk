import { stringToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/index';

import { DockDid, DidKeypair } from '../../src/utils/did';
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../test-constants';
import { verifyCredential, verifyPresentation } from '../../src/utils/vc/index';
import {
  blobHexIdToQualified,
  createNewDockBlobId,
  DockBlobIdByteSize,
} from '../../src/modules/blob';
import Schema from '../../src/modules/schema';
import VerifiableCredential from '../../src/verifiable-credential';
import exampleSchema from '../example-schema';
import VerifiablePresentation from '../../src/verifiable-presentation';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import { DockResolver } from '../../src/resolver';
import { Sr25519VerKeyName } from '../../src/utils/vc/crypto/constants';
import { registerNewDIDUsingPair } from './helpers';

let account;
let pair;
let dockDID;
let blobId;
let keyDoc;
let validCredential;
let invalidCredential;
let invalidFormatBlobId;
let dockResolver;

const ctx1 = {
  '@context': {
    emailAddress: 'https://schema.org/email',
    alumniOf: 'https://schema.org/alumniOf',
  },
};

const ctx2 = {
  '@context': {
    emailAddress: 'https://schema.org/email',
    notAlumniOf: 'https://schema.org/alumniOf',
  },
};

describe('Schema Blob Module Integration', () => {
  const dockApi = new DockAPI();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async () => {
    await dockApi.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dockApi.keyring.addFromUri(TestAccountURI);
    dockApi.setAccount(account);
    pair = DidKeypair.fromApi(dockApi);
    dockDID = DockDid.random();
    await registerNewDIDUsingPair(dockApi, dockDID, pair);
    blobId = randomAsHex(DockBlobIdByteSize);

    // Write a blob with invalid JSON-schema format
    invalidFormatBlobId = randomAsHex(DockBlobIdByteSize);
    let blob = {
      id: invalidFormatBlobId,
      blob: stringToHex('hello world'),
    };
    await dockApi.blob.new(
      blob,
      dockDID,
      pair,
      { didModule: dockApi.didModule },
      false,
    );

    // Write schema blob
    const blobStr = JSON.stringify(exampleSchema);
    blob = {
      id: blobId,
      blob: stringToHex(blobStr),
    };
    await dockApi.blob.new(
      blob,
      dockDID,
      pair,
      { didModule: dockApi.didModule },
      false,
    );

    // Properly format a keyDoc to use for signing
    keyDoc = getKeyDoc(
      dockDID,
      dockApi.keyring.addFromUri(firstKeySeed, null, 'sr25519'),
      Sr25519VerKeyName,
    );

    // Create a resolver for dock DIDs
    dockResolver = new DockResolver(dockApi);

    // Create a valid credential with a schema
    validCredential = new VerifiableCredential(
      'https://example.com/credentials/123',
    );
    validCredential.addContext(
      'https://www.w3.org/2018/credentials/examples/v1',
    );
    validCredential.addContext(ctx1);
    validCredential.addType('AlumniCredential');
    validCredential.addSubject({
      id: dockDID,
      alumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
    validCredential.setSchema(
      blobHexIdToQualified(blobId),
      'JsonSchemaValidator2018',
    );
    await validCredential.sign(keyDoc);

    // Create a valid credential that doesn't follow the schema
    invalidCredential = new VerifiableCredential(
      'https://example.com/credentials/1234',
    );
    invalidCredential.addContext(
      'https://www.w3.org/2018/credentials/examples/v1',
    );
    invalidCredential.addContext(ctx2);
    invalidCredential.addType('AlumniCredential');
    invalidCredential.addSubject({
      id: dockDID,
      notAlumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
    invalidCredential.setSchema(
      blobHexIdToQualified(blobId),
      'JsonSchemaValidator2018',
    );
    await invalidCredential.sign(keyDoc);
  }, 90000);

  afterAll(async () => {
    await dockApi.disconnect();
  }, 30000);

  test('Set and get schema', async () => {
    const schema = new Schema();
    await schema.setJSONSchema(exampleSchema);
    await dockApi.blob.new(
      schema.toBlob(),
      dockDID,
      pair,
      { didModule: dockApi.didModule },
      false,
    );
    const schemaObj = await Schema.get(blobId, dockApi);
    expect(schemaObj).toMatchObject({
      ...exampleSchema,
      id: blobId,
      author: dockDID.toString(),
    });
  }, 20000);

  test('Schema.get throws error when schema not in correct format.', async () => {
    await expect(Schema.get(invalidFormatBlobId, dockApi)).rejects.toThrow(
      /Incorrect schema format/,
    );
  }, 30000);

  test('Schema.get throws error when no blob exists at the given id.', async () => {
    await expect(Schema.get(createNewDockBlobId(), dockApi)).rejects.toThrow(
      /does not exist/,
    );
  }, 30000);

  test('Utility method verifyCredential should pass if the subject is compatible with the schema in credentialSchema.', async () => {
    await expect(
      verifyCredential(validCredential.toJSON(), {
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 30000);

  test('The verify method should pass if the subject is compatible with the schema in credentialSchema.', async () => {
    await expect(
      validCredential.verify({
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 30000);

  test('Utility method verifyCredential should check if schema is incompatible with the credentialSubject.', async () => {
    await expect(
      verifyCredential(invalidCredential.toJSON(), {
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      verifyCredential(invalidCredential.toJSON(), {
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test('The verify method should detect a subject with incompatible schema in credentialSchema.', async () => {
    await expect(
      invalidCredential.verify({
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test('Utility method verifyPresentation should check if schema is incompatible with the credentialSubject.', async () => {
    let vpInvalid = new VerifiablePresentation(
      'https://example.com/credentials/12345',
    );
    vpInvalid.addCredential(invalidCredential);
    vpInvalid.addContext(ctx2);
    vpInvalid = await vpInvalid.sign(keyDoc, 'some_challenge', 'some_domain');

    await expect(
      verifyPresentation(vpInvalid.toJSON(), {
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      verifyPresentation(vpInvalid.toJSON(), {
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test('Utility method verifyPresentation should check if schema is compatible with the credentialSubject.', async () => {
    let vpValid = new VerifiablePresentation(
      'https://example.com/credentials/12345',
    );
    vpValid.addCredential(validCredential);
    vpValid.addContext(ctx1);
    vpValid = await vpValid.sign(keyDoc, 'some_challenge', 'some_domain');

    await expect(
      verifyPresentation(vpValid.toJSON(), {
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 90000);

  test("VerifiablePresentation's verify should check if the schema is incompatible with the credentialSubject.", async () => {
    let vpInvalid = new VerifiablePresentation(
      'https://example.com/credentials/12345',
    );
    vpInvalid.addCredential(invalidCredential);
    vpInvalid.addContext(ctx2);
    vpInvalid = await vpInvalid.sign(keyDoc, 'some_challenge', 'some_domain');

    await expect(
      vpInvalid.verify({
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      vpInvalid.verify({
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test("VerifiablePresentation's verify should check if the schema is compatible with the credentialSubject.", async () => {
    let vpValid = new VerifiablePresentation(
      'https://example.com/credentials/12345',
    );
    vpValid.addCredential(validCredential);
    vpValid.addContext(ctx1);
    vpValid = await vpValid.sign(keyDoc, 'some_challenge', 'some_domain');

    await expect(
      vpValid.verify({
        challenge: 'some_challenge',
        domain: 'some_domain',
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 90000);
});
