import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/index';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';

import {
  OneOfPolicy,
} from '../../src/utils/revocation';
import { registerNewDIDUsingPair } from './helpers';

describe('Revocation Module', () => {
  const dock = new DockAPI();
  let pair;
  let pair2;

  // Create a random registry id
  const registryId = randomAsHex(32);
  // Create a random registry id
  const multipleControllerRegistryID = randomAsHex(32);

  // Create a new owner DID, the DID will be registered on the network and own the registry
  const ownerDID = randomAsHex(32);
  const ownerSeed = randomAsHex(32);

  const ownerDID2 = randomAsHex(32);
  const ownerSeed2 = randomAsHex(32);

  // Create  owners
  const owners = new Set();
  owners.add(ownerDID);

  // Create a registry policy
  const policy = new OneOfPolicy(owners);

  // Create revoke IDs
  const revokeId = randomAsHex(32);
  const revokeIds = new Set();
  revokeIds.add(revokeId);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Thees DIDs should be written before any test begins
    pair = dock.keyring.addFromUri(ownerSeed, null, 'sr25519');
    pair2 = dock.keyring.addFromUri(ownerSeed2, null, 'sr25519');

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, ownerDID, pair);
    // Register secondary DID
    await registerNewDIDUsingPair(dock, ownerDID2, pair2);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Can create a registry with a OneOf policy', async () => {
    await expect(dock.revocation.newRegistry(registryId, policy, false, false)).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke single from a registry', async () => {
    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, revokeIds, ownerDID, pair, 1, { didModule: dock.did });
    await dock.revocation.revoke(revoke, [[sig, nonce]], false);
    const revocationStatus = await dock.revocation.getIsRevoked(registryId, revokeId);
    expect(revocationStatus).toBe(true);
  }, 40000);


  test('Can unrevoke single from a registry', async () => {
    const [unrevoke, sig, nonce] = await dock.revocation.createSignedUnRevoke(registryId, revokeIds, ownerDID, pair, 1, { didModule: dock.did });
    await dock.revocation.unrevoke(unrevoke, [[sig, nonce]], false);

    const revocationStatus = await dock.revocation.getIsRevoked(registryId, revokeId);
    expect(revocationStatus).toBe(false);
  }, 40000);

  test('Can revoke and unrevoke multiple from a registry', async () => {
    const rIds = new Set();
    rIds.add(randomAsHex(32));
    rIds.add(randomAsHex(32));
    rIds.add(randomAsHex(32));

    const rIdsArr = Array.from(rIds);

    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, rIds, ownerDID, pair, 1, { didModule: dock.did });
    await dock.revocation.revoke(revoke, [[sig, nonce]], false);

    for (let i = 0; i < rIdsArr.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const status = await dock.revocation.getIsRevoked(registryId, rIdsArr[i]);
      expect(status).toBe(true);
    }

    const revocationStatuses = await dock.revocation.areRevoked(rIdsArr.map((r) => [registryId, r]));
    expect(revocationStatuses.length).toBe(rIds.size);
    revocationStatuses.forEach((s) => expect(s).toBe(true));

    const [unrevoke, sig1, nonce1] = await dock.revocation.createSignedUnRevoke(registryId, rIds, ownerDID, pair, 1, { didModule: dock.did });

    // Note: Intentionally passing true and waiting for finalization as not doing that makes the multi-query check fail.
    // This seems like a bug since the single query check done in next loop work. Even the upgrade to @polkadot/api version 9.14 didn't fix
    await dock.revocation.unrevoke(unrevoke, [[sig1, nonce1]], true);

    for (let i = 0; i < rIdsArr.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const status = await dock.revocation.getIsRevoked(registryId, rIdsArr[i]);
      expect(status).toBe(false);
    }

    const revocationStatuses1 = await dock.revocation.areRevoked(rIdsArr.map((r) => [registryId, r]));
    expect(revocationStatuses1.length).toBe(rIds.size);
    revocationStatuses1.forEach((s) => expect(s).toBe(false));
  }, 40000);

  test('Can remove a registry', async () => {
    const [remove, sig, nonce] = await dock.revocation.createSignedRemove(registryId, ownerDID, pair, 1, { didModule: dock.did });
    await dock.revocation.removeRegistry(remove, [[sig, nonce]], false);
    await expect(dock.revocation.getRevocationRegistry(registryId)).rejects.toThrow(/Could not find revocation registry/);
  }, 40000);

  test('Can create an add only registry', async () => {
    await expect(dock.revocation.newRegistry(registryId, policy, true, false)).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke from an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, revokeIds, ownerDID, pair, 1, { didModule: dock.did });
    await dock.revocation.revoke(revoke, [[sig, nonce]], false);

    const revocationStatus = await dock.revocation.getIsRevoked(registryId, revokeId);
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not unrevoke from an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [unrevoke, sig, nonce] = await dock.revocation.createSignedUnRevoke(registryId, revokeIds, ownerDID, pair, 1, { didModule: dock.did });
    await expect(
      dock.revocation.unrevoke(unrevoke, [[sig, nonce]], false),
    ).rejects.toThrow();

    const revocationStatus = await dock.revocation.getIsRevoked(registryId, revokeId);
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not remove an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [remove, sig, nonce] = await dock.revocation.createSignedRemove(registryId, ownerDID, pair, 1, { didModule: dock.did });
    await expect(
      dock.revocation.removeRegistry(remove, [[sig, nonce]], false),
    ).rejects.toThrow();

    await expect(dock.revocation.getRevocationRegistry(registryId)).resolves.toBeDefined();
  }, 40000);

  test('Can create a registry with multiple owners', async () => {
    const controllersNew = new Set();
    controllersNew.add(ownerDID);
    controllersNew.add(ownerDID2);

    // Create policy and registry with multiple owners
    const policyNew = new OneOfPolicy(controllersNew);
    await expect(dock.revocation.newRegistry(multipleControllerRegistryID, policyNew, false, false)).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(multipleControllerRegistryID);
    expect(reg.policy.isOneOf).toBe(true);

    const controllerSet = reg.policy.toJSON().oneOf;
    expect(controllerSet.length).toBe(2);

    let hasFirstDID = false;
    let hasSecondDID = false;
    controllerSet.forEach((controller) => {
      if (controller === ownerDID) {
        hasFirstDID = true;
      } else if (controller === ownerDID2) {
        hasSecondDID = true;
      }
    });
    expect(hasFirstDID && hasSecondDID).toBe(true);
  }, 40000);

  test('Can revoke, unrevoke and remove registry with multiple owners', async () => {
    const revId = randomAsHex(32);

    // Revoke
    await dock.revocation.revokeCredentialWithOneOfPolicy(multipleControllerRegistryID, revId, ownerDID, pair, 1, { didModule: dock.did }, false);
    const revocationStatus = await dock.revocation.getIsRevoked(multipleControllerRegistryID, revId);
    expect(revocationStatus).toBe(true);

    // Unrevoke from another DID
    await dock.revocation.unrevokeCredentialWithOneOfPolicy(multipleControllerRegistryID, revId, ownerDID2, pair2, 1, { didModule: dock.did }, false);
    const revocationStatus1 = await dock.revocation.getIsRevoked(multipleControllerRegistryID, revId);
    expect(revocationStatus1).toBe(false);

    // Remove
    await dock.revocation.removeRegistryWithOneOfPolicy(multipleControllerRegistryID, ownerDID, pair, 1, { didModule: dock.did }, false);
    await expect(dock.revocation.getRevocationRegistry(multipleControllerRegistryID)).rejects.toThrow(/Could not find revocation registry/);
  }, 30000);
});
