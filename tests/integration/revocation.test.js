import {randomAsHex} from '@polkadot/util-crypto';

import {DockAPI, PublicKeySr25519} from '../../src/api';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';

import  {
  OneOfPolicy,
} from '../../src/utils/revocation';
import {createKeyDetail} from '../../src/utils/did';

describe('Revocation Module', () => {
  const dock = new DockAPI();

  // Create a random registry id
  const registryID = randomAsHex(32);

  // Create a new controller DID, the DID will be registered on the network and own the registry
  const controllerDID = randomAsHex(32);
  const controllerDIDTwo = randomAsHex(32);
  const controllerSeed = randomAsHex(32);

  // Create a pAuth proof map (did, signature)
  const pAuth = new Map();

  // Create revoke IDs
  const revokeID = randomAsHex(32);
  const revokeIds = new Set();
  revokeIds.add(revokeID);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccount.uri, TestAccount.options);
    dock.setAccount(account);

    // The DID should be written before any test begins
    const pair = dock.keyring.addFromUri(controllerSeed, null, 'sr25519');
    const publicKey = PublicKeySr25519.fromKeyringPair(pair);
    pAuth.set(controllerDID, pair);

    // The controller is same as the DID
    const keyDetail = createKeyDetail(publicKey, controllerDID);
    const transaction = dock.did.new(controllerDID, keyDetail);
    await dock.sendTransaction(transaction);

    // Create secondary DID
    const keyDetailTwo = createKeyDetail(publicKey, controllerDIDTwo);
    const transactionTwo = dock.did.new(controllerDIDTwo, keyDetailTwo);
    await dock.sendTransaction(transactionTwo);
    done();
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test('Can create a registry', async () => {
    const controllers = new Set();
    controllers.add(controllerDID);

    const policy = new OneOfPolicy(controllers);
    const transaction = dock.revocation.newRegistry(registryID, policy, false);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
    const reg = await dock.revocation.getRevocationRegistry(registryID);
    expect(!!reg).toBe(true);
  }, 30000);

  test('Can revoke', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryID);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    const transaction = dock.revocation.revoke(registryID, revokeIds, lastModified, pAuth);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true); // TODO: expect promise to resolve

    const revocationStatus = await dock.revocation.getRevocationStatus(registryID, revokeID);
    expect(revocationStatus).toBe(true);
  }, 30000);

  test('Can unrevoke', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryID);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    const transaction = dock.revocation.unrevoke(registryID, revokeIds, lastModified, pAuth);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true); // TODO: expect promise to resolve

    const revocationStatus = await dock.revocation.getRevocationStatus(registryID, revokeID);
    expect(revocationStatus).toBe(false);
  }, 30000);

  test('Can remove a registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryID);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    const transaction = dock.revocation.removeRegistry(registryID, lastModified, pAuth);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
    await expect(dock.revocation.getRegistryDetail(registryID)).rejects.toThrow(/Could not find revocation registry/);
  }, 30000);

  test.skip('Can create a registry with multiple controllers', async () => {
    const controllers = new Set();
    controllers.add(controllerDID);
    controllers.add(controllerDIDTwo);

    const registryID = randomAsHex(32);

    const policy = new OneOfPolicy(controllers);
    const transaction = dock.revocation.newRegistry(registryID, policy, false);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
    const reg = await dock.revocation.getRevocationRegistry(registryID);
    expect(!!reg).toBe(true);
  }, 30000);
});
