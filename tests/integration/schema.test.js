import { stringToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/api';

import {
  hexDIDToQualified, createNewDockDID, createKeyDetail, getHexIdentifierFromDID,
} from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { verifyCredential, verifyPresentation } from '../../src/utils/vc';
import { blobHexIdToQualified, createNewDockBlobId, DockBlobIdByteSize } from '../../src/modules/blob';
import Schema from '../../src/modules/schema';
import VerifiableCredential from '../../src/verifiable-credential';
import exampleSchema from '../example-schema';
import VerifiablePresentation from '../../src/verifiable-presentation';
import getKeyDoc from '../../src/utils/vc/helpers';
import DockResolver from '../../src/dock-resolver';
import { SignatureSr25519 } from '../../src/signatures';

let account;
let pair;
let publicKey;
let dockDID;
let keyDetail;
let blobId;
let keyDoc;
let validCredential;
let invalidCredential;
let invalidFormatBlobId;
let dockResolver;

describe('Schema Blob Module Integration', () => {
  const dockApi = new DockAPI();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dockApi.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dockApi.keyring.addFromUri(TestAccountURI);
    dockApi.setAccount(account);
    pair = dockApi.keyring.addFromUri(firstKeySeed);
    publicKey = getPublicKeyFromKeyringPair(pair);
    dockDID = createNewDockDID();
    keyDetail = createKeyDetail(publicKey, dockDID);
    await dockApi.sendTransaction(dockApi.did.new(dockDID, keyDetail));
    blobId = randomAsHex(DockBlobIdByteSize);

    // Write a blob with invalid JSON-schema format
    invalidFormatBlobId = randomAsHex(DockBlobIdByteSize);
    await dockApi.sendTransaction(dockApi.blob.new({
      id: invalidFormatBlobId,
      blob: stringToHex('hello world'),
      author: getHexIdentifierFromDID(dockDID),
    }, pair), false);

    // Write schema blob
    const blobStr = JSON.stringify(exampleSchema);
    await dockApi.sendTransaction(dockApi.blob.new({
      id: blobId,
      blob: stringToHex(blobStr),
      author: getHexIdentifierFromDID(dockDID),
    }, pair), false);

    // Properly format a keyDoc to use for signing
    keyDoc = getKeyDoc(
      dockDID,
      dockApi.keyring.addFromUri(firstKeySeed, null, 'sr25519'),
      'Sr25519VerificationKey2020',
    );

    // Create a resolver for dock DIDs
    dockResolver = new DockResolver(dockApi);

    // Create a valid credential with a schema
    validCredential = new VerifiableCredential('https://example.com/credentials/123');
    validCredential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    const ctx1 = {
      '@context': {
        emailAddress: 'https://schema.org/email',
      },
    };
    validCredential.addContext(ctx1);
    validCredential.addType('AlumniCredential');
    validCredential.addSubject({
      id: dockDID,
      alumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
    validCredential.setSchema(blobHexIdToQualified(blobId), 'JsonSchemaValidator2018');
    await validCredential.sign(keyDoc);

    // Create a valid credential that doesn't follow the schema
    invalidCredential = new VerifiableCredential('https://example.com/credentials/1234');
    invalidCredential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    const ctx2 = {
      '@context': {
        emailAddress: 'https://schema.org/email',
        notAlumniOf: 'https://schema.org/alumniOf',
      },
    };
    invalidCredential.addContext(ctx2);
    invalidCredential.addType('AlumniCredential');
    invalidCredential.addSubject({
      id: dockDID,
      notAlumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
    invalidCredential.setSchema(blobHexIdToQualified(blobId), 'JsonSchemaValidator2018');
    await invalidCredential.sign(keyDoc);

    done();
  }, 90000);

  afterAll(async () => {
    await dockApi.disconnect();
  }, 30000);

  test('setSignature will only accept signature of the supported types and set the signature key of the object.', async () => {
    const schema = new Schema();
    schema.setAuthor(dockDID);
    schema.name = 'AlumniCredSchema';
    await schema.setJSONSchema(exampleSchema);
    const msg = dockApi.blob.getSerializedBlob(schema.toBlob());
    const pk = getPublicKeyFromKeyringPair(pair);
    const sig = new SignatureSr25519(msg, pair);
    schema.setSignature(sig);
    expect(schema.signature).toBe(sig);
  });

  test('sign will generate a signature on the schema detail, this signature is verifiable.', async () => {
    const schema = new Schema();
    schema.setAuthor(dockDID);
    await schema.setJSONSchema(exampleSchema);
    schema.name = 'AlumniCredSchema';
    schema.sign(pair, dockApi.blob);
    expect(!!schema.signature).toBe(true);
  });

  test('getSchema will return schema in correct format.', async () => {
    await expect(Schema.getSchema(blobId, dockApi)).resolves.toMatchObject({
      ...exampleSchema,
      id: blobId,
      author: hexDIDToQualified(getHexIdentifierFromDID(dockDID)),
    });
  }, 30000);

  test('getSchema throws error when schema not in correct format.', async () => {
    await expect(Schema.getSchema(invalidFormatBlobId, dockApi)).rejects.toThrow(/Incorrect schema format/);
  }, 30000);

  test('getSchema throws error when no blob exists at the given id.', async () => {
    await expect(Schema.getSchema(createNewDockBlobId(), dockApi)).rejects.toThrow(/does not exist/);
  }, 30000);

  test('Utility method verifyCredential should pass if the subject is compatible with the schema in credentialSchema.', async () => {
    await expect(
      verifyCredential(
        validCredential.toJSON(), dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).resolves.toBeDefined();
  }, 30000);

  test('The verify method should pass if the subject is compatible with the schema in credentialSchema.', async () => {
    await expect(
      validCredential.verify(
        dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).resolves.toBeDefined();
  }, 30000);


  test('Utility method verifyCredential should check if schema is incompatible with the credentialSubject.', async () => {
    await expect(
      verifyCredential(
        invalidCredential.toJSON(), dockResolver, true, false, undefined, { notDock: dockApi },
      ),
    ).rejects.toThrow('Only Dock schemas are supported as of now.');

    await expect(
      verifyCredential(
        invalidCredential.toJSON(), dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test('The verify method should detect a subject with incompatible schema in credentialSchema.', async () => {
    await expect(
      invalidCredential.verify(
        dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);


  test('Utility method verifyPresentation should check if schema is incompatible with the credentialSubject.', async () => {
    let vpInvalid = new VerifiablePresentation('https://example.com/credentials/12345');
    vpInvalid.addCredential(
      invalidCredential,
    );
    vpInvalid = await vpInvalid.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );

    await expect(
      verifyPresentation(
        vpInvalid.toJSON(), 'some_challenge', 'some_domain', dockResolver, true, false, undefined, { notDock: dockApi },
      ),
    ).rejects.toThrow('Only Dock schemas are supported as of now.');

    await expect(
      verifyPresentation(
        vpInvalid.toJSON(), 'some_challenge', 'some_domain', dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test('Utility method verifyPresentation should check if schema is compatible with the credentialSubject.', async () => {
    let vpValid = new VerifiablePresentation('https://example.com/credentials/12345');
    vpValid.addCredential(
      validCredential,
    );
    vpValid = await vpValid.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );

    await expect(
      verifyPresentation(
        vpValid.toJSON(), 'some_challenge', 'some_domain', dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).resolves.toBeDefined();
  }, 90000);

  test('VerifiablePresentation\'s verify should check if the schema is incompatible with the credentialSubject.', async () => {
    let vpInvalid = new VerifiablePresentation('https://example.com/credentials/12345');
    vpInvalid.addCredential(
      invalidCredential,
    );
    vpInvalid = await vpInvalid.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );

    await expect(
      vpInvalid.verify(
        'some_challenge', 'some_domain', dockResolver, true, false, undefined, { notDock: dockApi },
      ),
    ).rejects.toThrow('Only Dock schemas are supported as of now.');

    await expect(
      vpInvalid.verify(
        'some_challenge', 'some_domain', dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test('VerifiablePresentation\'s verify should check if the schema is compatible with the credentialSubject.', async () => {
    let vpValid = new VerifiablePresentation('https://example.com/credentials/12345');
    vpValid.addCredential(
      validCredential,
    );
    vpValid = await vpValid.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );

    await expect(
      vpValid.verify(
        'some_challenge', 'some_domain', dockResolver, true, false, undefined, { dock: dockApi },
      ),
    ).resolves.toBeDefined();
  }, 90000);
});
