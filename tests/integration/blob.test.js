import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

import { DockAPI } from '../../src/api';

import {createNewDockDID, createKeyDetail, getHexIdentifierFromDID} from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { DockBlobByteSize } from '../../src/modules/blob';


describe('Blob Module', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDID = createNewDockDID();

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

  test('Has keyring and account', () => {
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    expect(!!dock.keyring).toBe(true);
    expect(!!dock.account).toBe(true);
  });

  test('Can create a DID', async () => {
    const pair = dock.keyring.addFromUri(firstKeySeed);
    const publicKey = getPublicKeyFromKeyringPair(pair);

    // The controller is same as the DID
    const keyDetail = createKeyDetail(publicKey, dockDID);

    const transaction = dock.did.new(dockDID, keyDetail);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
    const document = await dock.did.getDocument(dockDID);
    expect(!!document).toBe(true);
  }, 30000);

  test('Can create a Blob.', async () => {
    const pair = dock.keyring.addFromUri(firstKeySeed);

    const blobId = randomAsHex(DockBlobByteSize);
    // Both blob vec and blob hex work
    const blobHex = randomAsHex(32);
    const blobVec = [1, 2, 3];
    const transaction = await dock.blob.new(
      {
        id: blobId,
        // blob: blobHex,
        blob: blobVec,
        author: getHexIdentifierFromDID(dockDID),
      },
      pair,
    );

    const result = await dock.sendTransaction(transaction, false);
    expect(!!result).toBe(true);

    const chainBlob = await dock.blob.getBlob(blobId);
    expect(!!chainBlob).toBe(true);
    console.log('authos', chainBlob[0]);
    console.log('blob', chainBlob[0]);

    // TODO: expect the retrieved blob to be the same as the one I sent
  }, 30000);
});
