import { u8aToString, u8aToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/api';

import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { DockBlobIdByteSize, BLOB_MAX_BYTE_SIZE } from '../../src/modules/blob';

let account;
let pair;
let publicKey;
let dockDID;
let keyDetail;
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

  // afterAll(async () => {
  //   await dock.disconnect();
  // }, 10000);

  beforeEach(async () => {
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = dock.keyring.addFromUri(firstKeySeed);
    publicKey = getPublicKeyFromKeyringPair(pair);
    dockDID = createNewDockDID();
    keyDetail = createKeyDetail(publicKey, dockDID);
    await dock.did.new(dockDID, keyDetail);
    await dock.did.getDocument(dockDID);
    blobId = randomAsHex(DockBlobIdByteSize);
  }, 30000);

  test('Can create and read a JSON Blob.', async () => {
    const blobJSON = {
      jsonBlob: true,
    };
    const result = await dock.blob.new(
      {
        id: blobId,
        blob: blobJSON,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
      undefined,
      false,
    );

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[1]).toEqual(blobJSON);
  }, 30000);

  test('Can create and read a string Blob.', async () => {
    const blobHex = 'my string';
    const result = await dock.blob.new(
      {
        id: blobId,
        blob: blobHex,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
      undefined,
      false,
    );

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(u8aToString(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test('Can create and read a hex Blob.', async () => {
    const blobHex = randomAsHex(32);
    const result = await dock.blob.new(
      {
        id: blobId,
        blob: blobHex,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
      undefined,
      false,
    );

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(u8aToHex(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test('Can create and read a Vector Blob.', async () => {
    const blobVect = new Uint8Array([1, 2, 3]);
    const result = await dock.blob.new(
      {
        id: blobId,
        blob: blobVect,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
      undefined,
      false,
    );

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[1]).toEqual(blobVect);
  }, 30000);

  test('Fails to write blob with size greater than allowed.', async () => {
    const blobHex = randomAsHex(BLOB_MAX_BYTE_SIZE + 1); // Max size is 1024

    await expect(
      dock.blob.new(
        {
          id: blobId,
          blob: blobHex,
          author: getHexIdentifierFromDID(dockDID),
        },
        pair,
        undefined,
        false,
      ),
    ).rejects.toThrow();

    await expect(
      dock.blob.get(blobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);

  test('Fails to write blob with id already used.', async () => {
    const blobHexFirst = randomAsHex(12);
    const resultFirst = await dock.blob.new(
      {
        id: blobId,
        blob: blobHexFirst,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
      undefined,
      false,
    );

    expect(!!resultFirst).toBe(true);
    expect(errorInResult(resultFirst)).toBe(false);

    await expect(
      dock.blob.new(
        {
          id: blobId,
          blob: randomAsHex(123),
          author: getHexIdentifierFromDID(dockDID),
        },
        pair,
        undefined,
        false,
      ),
    ).rejects.toThrow();
  }, 60000);

  test('Should throw error when cannot read blob with given id from chain.', async () => {
    const nonExistentBlobId = randomAsHex(DockBlobIdByteSize);
    await expect(
      dock.blob.get(nonExistentBlobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);
});
