import { u8aToU8a, u8aToString, u8aToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/api';

import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { verifyCredential } from '../../src/utils/vc';
import { DockBlobByteSize } from '../../src/modules/blob';
import Schema, { createNewSchemaID } from '../../src/modules/schema';
import VerifiableCredential from '../../src/verifiable-credential';
import exampleCredential from '../example-credential';
import exampleSchema from '../example-schema';

let account;
let pair;
let publicKey;
let dockDID;
let keyDetail;
let txDid;
// eslint-disable-next-line no-unused-vars
let resultDid;
// eslint-disable-next-line no-unused-vars
let didDoc;
let blobId;

describe('Schema Blob Module Integration', () => {
  const dock = new DockAPI();
  let invalidFormatBlobId;

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = dock.keyring.addFromUri(firstKeySeed);
    publicKey = getPublicKeyFromKeyringPair(pair);
    dockDID = createNewDockDID();
    keyDetail = createKeyDetail(publicKey, dockDID);
    await dock.sendTransaction(dock.did.new(dockDID, keyDetail));
    blobId = randomAsHex(DockBlobByteSize);

    // Write invalid format blob
    invalidFormatBlobId = randomAsHex(DockBlobByteSize);
    await dock.sendTransaction(dock.blob.new({
        id: invalidFormatBlobId,
        blob: u8aToHex(u8aToU8a('hello world')),
        author: getHexIdentifierFromDID(dockDID),
      }, pair
    ), false);

    // Write schema blob
    const blobStr = JSON.stringify(exampleSchema);
    await dock.sendTransaction(dock.blob.new({
        id: blobId,
        blob: u8aToHex(u8aToU8a(blobStr)),
        author: getHexIdentifierFromDID(dockDID),
      }, pair
    ), false);

    done();
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test('getSchema will return schema in correct format.', async () => {
    await expect(Schema.getSchema(blobId, dock)).resolves.toMatchObject({
      ...exampleSchema,
      id: blobId,
      author: getHexIdentifierFromDID(dockDID)
    });
  }, 30000);

  test('getSchema throws error when schema not in correct format.', async () => {
    await expect(Schema.getSchema(invalidFormatBlobId, dock)).rejects.toThrow(/Incorrect schema format/);
  }, 30000);

  test('getSchema throws error when no blob exists at the given id.', async () => {
    await expect(Schema.getSchema(createNewSchemaID(), dock)).rejects.toThrow(/does not exist/);
  }, 30000);

  const vcInvalid = {
    ...exampleCredential,
    credentialSubject: {
      id: 'invalid',
      notEmailAddress: 'john.smith@example.com',
      notAlumniOf: 'Example Invalid',
    }
  };

  // TODO: these two tests should pass once verifyCredential has been updated
  test('Utility method verifyCredential should check if schema is incompatible with the credentialSubject.', async () => {
    await expect(
      verifyCredential(vcInvalid, null, false, false, { dock })
    ).rejects.toThrow();
  }, 30000);

  test('The verify method should detect a subject with incompatible schema in credentialSchema.', async () => {
    const vc = VerifiableCredential.fromJSON(vcInvalid);
    await expect(
      vc.verify(null, false, false, { dock })
    ).rejects.toThrow();
  }, 30000);
});
