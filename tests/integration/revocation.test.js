import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../src/index';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../test-constants';

import { OneOfPolicy } from '../../src/utils/revocation';
import { DidKeypair, DockDid } from '../../src/did';
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
  const ownerDID = DockDid.random();
  const ownerSeed = randomAsHex(32);

  const ownerDID2 = DockDid.random();
  const ownerSeed2 = randomAsHex(32);

  // Create  owners
  const owners = new Set();
  let policy;

  // Create revoke IDs
  const revokeId = randomAsHex(32);
  const revokeIds = new Set();
  revokeIds.add(revokeId);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    owners.add(ownerDID);

    // Create a registry policy
    policy = new OneOfPolicy(owners);

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Thees DIDs should be written before any test begins
    pair = DidKeypair.fromApi(dock, {
      seed: ownerSeed,
      keypairType: 'sr25519',
    });
    pair2 = DidKeypair.fromApi(dock, {
      seed: ownerSeed2,
      keypairType: 'sr25519',
    });

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, ownerDID, pair);
    // Register secondary DID
    await registerNewDIDUsingPair(dock, ownerDID2, pair2);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Can create a registry with a OneOf policy', async () => {
    await expect(
      dock.revocation.newRegistry(registryId, policy, false, false),
    ).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke single from a registry', async () => {
    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(
      registryId,
      revokeIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await dock.revocation.revoke(revoke, [{ nonce, sig }], false);
    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can unrevoke single from a registry', async () => {
    const [unrevoke, sig, nonce] = await dock.revocation.createSignedUnRevoke(
      registryId,
      revokeIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await dock.revocation.unrevoke(unrevoke, [{ nonce, sig }], false);

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(false);
  }, 40000);

  test('Can revoke and unrevoke multiple from a registry', async () => {
    const rIds = new Set();
    const count = 500;

    for (let i = 0; i < count; i++) {
      rIds.add(randomAsHex(32));
    }

    const rIdsArr = Array.from(rIds);

    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(
      registryId,
      rIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await dock.revocation.revoke(revoke, [{ nonce, sig }], false);

    console.time(`Check ${count} revocation status one by one`);
    for (let i = 0; i < rIdsArr.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const status = await dock.revocation.getIsRevoked(registryId, rIdsArr[i]);
      expect(status).toBe(true);
    }
    console.timeEnd(`Check ${count} revocation status one by one`);

    console.time(`Check ${count} revocation status in a batch`);
    const revocationStatuses = await dock.revocation.areRevoked(
      rIdsArr.map((r) => [registryId, r]),
    );
    expect(revocationStatuses.length).toBe(rIds.size);
    revocationStatuses.forEach((s) => expect(s).toBe(true));
    console.timeEnd(`Check ${count} revocation status in a batch`);

    const [unrevoke, sig1, nonce1] = await dock.revocation.createSignedUnRevoke(
      registryId,
      rIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );

    // Note: Intentionally passing true and waiting for finalization as not doing that makes the multi-query check fail.
    // This seems like a bug since the single query check done in next loop work. Even the upgrade to @polkadot/api version 9.14 didn't fix
    await dock.revocation.unrevoke(
      unrevoke,
      [{ nonce: nonce1, sig: sig1 }],
      true,
    );

    for (let i = 0; i < rIdsArr.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const status = await dock.revocation.getIsRevoked(registryId, rIdsArr[i]);
      expect(status).toBe(false);
    }

    const revocationStatuses1 = await dock.revocation.areRevoked(
      rIdsArr.map((r) => [registryId, r]),
    );
    expect(revocationStatuses1.length).toBe(rIds.size);
    revocationStatuses1.forEach((s) => expect(s).toBe(false));
  }, 40000);

  test('Can remove a registry', async () => {
    const [remove, sig, nonce] = await dock.revocation.createSignedRemove(
      registryId,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await dock.revocation.removeRegistry(remove, [{ nonce, sig }], false);
    await expect(
      dock.revocation.getRevocationRegistry(registryId),
    ).rejects.toThrow(/Could not find revocation registry/);
  }, 40000);

  test('Can create an add only registry', async () => {
    await expect(
      dock.revocation.newRegistry(registryId, policy, true, false),
    ).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke from an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [revoke, sig, nonce] = await dock.revocation.createSignedRevoke(
      registryId,
      revokeIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await dock.revocation.revoke(revoke, [{ nonce, sig }], false);

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not unrevoke from an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [unrevoke, sig, nonce] = await dock.revocation.createSignedUnRevoke(
      registryId,
      revokeIds,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await expect(
      dock.revocation.unrevoke(unrevoke, [{ nonce, sig }], false),
    ).rejects.toThrow();

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not remove an add only registry', async () => {
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);

    const [remove, sig, nonce] = await dock.revocation.createSignedRemove(
      registryId,
      ownerDID,
      pair,
      { didModule: dock.did },
    );
    await expect(
      dock.revocation.removeRegistry(remove, [{ nonce, sig }], false),
    ).rejects.toThrow();

    await expect(
      dock.revocation.getRevocationRegistry(registryId),
    ).resolves.toBeDefined();
  }, 40000);

  test('Can create a registry with multiple owners', async () => {
    const controllersNew = new Set();
    controllersNew.add(ownerDID);
    controllersNew.add(ownerDID2);

    // Create policy and registry with multiple owners
    const policyNew = new OneOfPolicy(controllersNew);
    await expect(
      dock.revocation.newRegistry(
        multipleControllerRegistryID,
        policyNew,
        false,
        false,
      ),
    ).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(
      multipleControllerRegistryID,
    );
    expect(reg.policy.isOneOf).toBe(true);

    const controllerSet = reg.policy.asOneOf;
    expect(controllerSet.toJSON().length).toBe(2);

    let hasFirstDID = false;
    let hasSecondDID = false;
    [...controllerSet.entries()]
      .flatMap((v) => v)
      .map((cnt) => DockDid.from(cnt))
      .forEach((controller) => {
        if (controller.toString() === ownerDID.toString()) {
          hasFirstDID = true;
        } else if (controller.toString() === ownerDID2.toString()) {
          hasSecondDID = true;
        }
      });
    expect(hasFirstDID && hasSecondDID).toBe(true);
  }, 40000);

  test('Can revoke, unrevoke and remove registry with multiple owners', async () => {
    const revId = randomAsHex(32);

    // Revoke
    await dock.revocation.revokeCredentialWithOneOfPolicy(
      multipleControllerRegistryID,
      revId,
      ownerDID,
      pair,
      { didModule: dock.did },
      false,
    );
    const revocationStatus = await dock.revocation.getIsRevoked(
      multipleControllerRegistryID,
      revId,
    );
    expect(revocationStatus).toBe(true);

    // Unrevoke from another DID
    await dock.revocation.unrevokeCredentialWithOneOfPolicy(
      multipleControllerRegistryID,
      revId,
      ownerDID2,
      pair2,
      { didModule: dock.did },
      false,
    );
    const revocationStatus1 = await dock.revocation.getIsRevoked(
      multipleControllerRegistryID,
      revId,
    );
    expect(revocationStatus1).toBe(false);

    // Remove
    await dock.revocation.removeRegistryWithOneOfPolicy(
      multipleControllerRegistryID,
      ownerDID,
      pair,
      { didModule: dock.did },
      false,
    );
    await expect(
      dock.revocation.getRevocationRegistry(multipleControllerRegistryID),
    ).rejects.toThrow(/Could not find revocation registry/);
  }, 30000);
});
