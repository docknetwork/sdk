import { u8aToU8a, u8aToString, u8aToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/api';

import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { verifyCredential } from '../../src/utils/vc';
import { DockBlobIdByteSize } from '../../src/modules/blob';
import Schema, { createNewSchemaID } from '../../src/modules/schema';
import exampleCredential from '../example-credential';
import exampleSchema from '../example-schema';

let account;
let pair;
let publicKey;
let dockDID;
let keyDetail;
let txDid;
let resultDid;
let didDoc;
let blobId;

function errorInResult(result) {
  try {
    return result.events[0].event.data[0].toJSON().Module.error === 1;
  } catch (e) {
    return false;
  }
}

describe('Blob Module', () => {
  const dock = new DockAPI();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  beforeEach(async () => {
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = dock.keyring.addFromUri(firstKeySeed);
    publicKey = getPublicKeyFromKeyringPair(pair);
    dockDID = createNewDockDID();
    keyDetail = createKeyDetail(publicKey, dockDID);
    txDid = dock.did.new(dockDID, keyDetail);
    resultDid = await dock.sendTransaction(txDid);
    didDoc = await dock.did.getDocument(dockDID);
    blobId = randomAsHex(DockBlobIdByteSize);
  }, 30000);

  test('Can create and read a Hex Blob.', async () => {
    const blobHex = randomAsHex(32);
    const txBlob = await dock.blob.new(
      {
        id: blobId,
        blob: blobHex,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const result = await dock.sendTransaction(txBlob, false);
    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.getBlob(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[1].toString(16)).toEqual(blobHex);
  }, 30000);

  test('Can create and read a Vector Blob.', async () => {
    const blobVect = [1, 2, 3];
    const transaction = await dock.blob.new(
      {
        id: blobId,
        blob: blobVect,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const result = await dock.sendTransaction(transaction, false);
    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.getBlob(blobId);
    expect(!!chainBlob).toBe(true);
    expect(Array.from(chainBlob[1])).toEqual(blobVect);
  }, 30000);


  test('Fails to write blob with size greater than allowed.', async () => {
    const blobHex = randomAsHex(1025); // Max size is 1024
    const transaction = await dock.blob.new(
      {
        id: blobId,
        blob: blobHex,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const result = await dock.sendTransaction(transaction, false);
    expect(!!result).toBe(true);
    await expect(
      dock.blob.getBlob(blobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);

  test('Fails to write blob with id already used.', async () => {
    const blobHexFirst = randomAsHex(12);
    const txFirst = await dock.blob.new(
      {
        id: blobId,
        blob: blobHexFirst,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const resultFirst = await dock.sendTransaction(txFirst, false);
    expect(!!resultFirst).toBe(true);

    const chainBlob = await dock.blob.getBlob(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[1].toString(16)).toEqual(blobHexFirst);

    const blobHexSecond = randomAsHex(123);
    const txSecond = await dock.blob.new(
      {
        id: blobId,
        blob: blobHexSecond,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const resultSecond = await dock.sendTransaction(txSecond, false);
    expect(errorInResult(resultFirst)).toBe(false);
    expect(errorInResult(resultSecond)).toBe(true);
  }, 60000);


  test('Should throw error when cannot read blob with given id from chain.', async () => {
    const nonExistentBlobId = randomAsHex(DockBlobIdByteSize);
    await expect(
      dock.blob.getBlob(nonExistentBlobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);
});
