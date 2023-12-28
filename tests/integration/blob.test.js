import { u8aToString, u8aToHex } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/index';

import { createNewDockDID, typedHexDID, DidKeypair } from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { DockBlobIdByteSize, BLOB_MAX_BYTE_SIZE } from '../../src/modules/blob';
import { registerNewDIDUsingPair } from './helpers';

let account;
let pair;
let dockDID;
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

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = new DidKeypair(dock.keyring.addFromUri(firstKeySeed), 1);
    dockDID = createNewDockDID();
    await registerNewDIDUsingPair(dock, typedHexDID(dockDID), pair);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  beforeEach(async () => {
    blobId = randomAsHex(DockBlobIdByteSize);
  }, 30000);

  test('Can create and read a JSON Blob.', async () => {
    const blobJSON = {
      jsonBlob: true,
    };
    const blob = {
      id: blobId,
      blob: blobJSON,
    };
    const result = await dock.blob.new(blob, dockDID, pair, dock, false);

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(typedHexDID(dockDID));
    expect(chainBlob[1]).toEqual(blobJSON);
  }, 30000);

  test('Can create and read a string Blob.', async () => {
    const blobHex = 'my string';
    const blob = {
      id: blobId,
      blob: blobHex,
    };
    const result = await dock.blob.new(blob, dockDID, pair, dock, false);

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(typedHexDID(dockDID));
    expect(u8aToString(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test('Can create and read a hex Blob.', async () => {
    const blobHex = randomAsHex(32);
    const blob = {
      id: blobId,
      blob: blobHex,
    };

    const result = await dock.blob.new(blob, dockDID, pair, dock, false);

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(typedHexDID(dockDID));
    expect(u8aToHex(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test('Can create and read a Vector Blob.', async () => {
    const blobVect = new Uint8Array([1, 2, 3]);
    const blob = {
      id: blobId,
      blob: blobVect,
    };

    const result = await dock.blob.new(blob, dockDID, pair, dock, false);

    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(typedHexDID(dockDID));
    expect(chainBlob[1]).toEqual(blobVect);
  }, 30000);

  test('Fails to write blob with size greater than allowed.', async () => {
    const blobHex = randomAsHex(BLOB_MAX_BYTE_SIZE + 1); // Max size is 1024
    const blob = {
      id: blobId,
      blob: blobHex,
    };
    await expect(dock.blob.new(blob, dockDID, pair, dock, false)).rejects.toThrow();

    await expect(
      dock.blob.get(blobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);

  test('Fails to write blob with id already used.', async () => {
    const blobHexFirst = randomAsHex(12);
    let blob = {
      id: blobId,
      blob: blobHexFirst,
    };
    const resultFirst = await dock.blob.new(blob, dockDID, pair, dock, false);

    expect(!!resultFirst).toBe(true);
    expect(errorInResult(resultFirst)).toBe(false);

    blob = {
      id: blobId,
      blob: randomAsHex(123),
    };

    await expect(dock.blob.new(blob, dockDID, pair, dock, false)).rejects.toThrow();
  }, 60000);

  test('Should throw error when cannot read blob with given id from chain.', async () => {
    const nonExistentBlobId = randomAsHex(DockBlobIdByteSize);
    await expect(
      dock.blob.get(nonExistentBlobId),
    ).rejects.toThrowError('does not exist');
  }, 30000);
});
