import {randomAsHex} from '@polkadot/util-crypto';

import {DockAPI} from '../../src/api';

import {
  createNewDockDID,
  createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval
} from '../../src/utils/did';
import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {getPublicKeyFromKeyringPair} from '../../src/utils/misc';
import {PublicKeyEd25519} from '../../src/public-key';

describe('DID Module', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDID = createNewDockDID();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  // Generate second key (for update) with this seed. The key type is Ed25519
  const secondKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test('Has keyring and account', () => {
    const account = dock.keyring.addFromUri(TestAccount.uri, TestAccount.options);
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

  test('Can get a DID document', async () => {
    const result = await dock.did.getDocument(dockDID);
    expect(!!result).toBe(true);
  }, 10000);

  test('Can update a DID key to ed25519 key', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

    // Update DID key to the following
    const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
    const newPk = PublicKeyEd25519.fromKeyringPair(newPair);
    const newController = randomAsHex(32);

    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, dockDID, newPk, currentPair, newController);

    const transaction = dock.did.updateKey(keyUpdate, signature);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
  }, 30000);

  test('Can remove a DID', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

    const [didRemoval, signature] = await createSignedDidRemoval(dock.did, dockDID, currentPair);

    const transaction = dock.did.remove(didRemoval, signature);
    const result = await dock.sendTransaction(transaction);
    if (result) {
      await expect(dock.did.getDocument(dockDID)).rejects.toThrow(/does not exist/);
    }
  }, 30000);
});
