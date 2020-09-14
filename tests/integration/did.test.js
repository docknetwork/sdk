import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/api';

import {
  createNewDockDID, getHexIdentifierFromDID,
  createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval,
} from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { PublicKeyEd25519 } from '../../src/public-keys';

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

    const result = await dock.did.new(dockDID, keyDetail, false);
    expect(!!result).toBe(true);
    const document = await dock.did.getDocument(dockDID);
    expect(!!document).toBe(true);
  }, 30000);

  test('Can get a DID document', async () => {
    const result = await dock.did.getDocument(dockDID);
    expect(!!result).toBe(true);
  }, 10000);

  test('Can update a DID controller', async () => {
    const pair = dock.keyring.addFromUri(firstKeySeed);
    const publicKey = getPublicKeyFromKeyringPair(pair);

    // Get the current did controller
    const originalDoc = await dock.did.getDocument(dockDID);
    const currentController = getHexIdentifierFromDID(originalDoc.publicKey[0].controller);

    // Send key update without changing controller
    const [keyUpdateNoModify, signatureNoModify] = await createSignedKeyUpdate(dock.did, dockDID, publicKey, pair);
    await dock.did.updateKey(keyUpdateNoModify, signatureNoModify, false);
    const currentResult = await dock.did.getDocument(dockDID);
    const currentControllerFromChain = getHexIdentifierFromDID(currentResult.publicKey[0].controller);
    expect(currentControllerFromChain).toBe(currentController);

    // Send key update changing controller to newController
    const newController = randomAsHex(32);
    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, dockDID, publicKey, pair, newController);
    await dock.did.updateKey(keyUpdate, signature, false);

    // Assert that the controller change was successful
    const result = await dock.did.getDocument(dockDID);
    const newControllerFromChain = getHexIdentifierFromDID(result.publicKey[0].controller);
    expect(newControllerFromChain).toBe(newController);
  }, 30000);

  test('Can update a DID key to ed25519 key', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

    // Update DID key to the following
    const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
    const newPk = PublicKeyEd25519.fromKeyringPair(newPair);

    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, dockDID, newPk, currentPair);
    // Since controller was not passed, it should not be passed in the key update
    expect(keyUpdate.controller).toBe(undefined);

    const result = await dock.did.updateKey(keyUpdate, signature, false);
    expect(!!result).toBe(true);
  }, 30000);

  test('Can remove a DID', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

    const [didRemoval, signature] = await createSignedDidRemoval(dock.did, dockDID, currentPair);

    const result = await dock.did.remove(didRemoval, signature, false);
    if (result) {
      await expect(dock.did.getDocument(dockDID)).rejects.toThrow(/does not exist/);
    }
  }, 30000);
});
