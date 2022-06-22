import { randomAsHex } from '@polkadot/util-crypto';

import { BTreeSet, Vec } from '@polkadot/types';
import { DockAPI } from '../../src/index';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../test-constants';

import { OneOfPolicy, KeyringPairDidKeys } from '../../src/utils/revocation';
import { registerNewDIDUsingPair } from './helpers';

describe('Revocation Module', () => {
  const dock = new DockAPI();
  let pair;

  let registryId; let policy; let revokeIds; let revokeId; let controllerDID; let
    didKeys;

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // Create a random registry id
    registryId = randomAsHex(32);

    // Create a new controller DID, the DID will be registered on the network and own the registry
    const controllerDIDRaw = randomAsHex(32);
    controllerDID = controllerDIDRaw;
    const controllerSeed = randomAsHex(32);

    // Create a did/keypair proof map
    didKeys = new KeyringPairDidKeys();

    // Create a list of controllers
    const controllers = new Set();
    controllers.add(controllerDID);

    // Create a registry policy
    policy = new OneOfPolicy(controllers);

    // Create revoke IDs
    revokeId = randomAsHex(32);
    revokeIds = new Set();
    revokeIds.add(revokeId);

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // The DID should be written before any test begins
    pair = dock.keyring.addFromUri(controllerSeed, null, 'sr25519');

    // Set our controller DID and associated keypair to be used for generating proof
    didKeys.set(controllerDIDRaw, pair);

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, controllerDID, pair);
    done();
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Can create a registry with multiple controllers', async () => {
    // Create secondary DID
    const controllerDIDTwo = randomAsHex(32);
    await registerNewDIDUsingPair(dock, controllerDIDTwo, pair);

    const controllersNew = new Set();
    controllersNew.add(controllerDID);
    controllersNew.add(controllerDIDTwo);

    // Create policy and registry with multiple controllers
    const policyNew = new OneOfPolicy(controllersNew);
    const multipleControllerRegistryID = randomAsHex(32);

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

    // TODO: FIX: temporary disable test because _raw cant be accessed anymore
    // const controllerSet = reg.policy._raw;
    // expect(controllerSet.size).toBe(2);
    //
    // let hasFirstDID = false;
    // let hasSecondDID = false;
    // controllerSet.forEach((controller) => {
    //   if (controller.toString() === controllerDID) {
    //     hasFirstDID = true;
    //   } else if (controller.toString() === controllerDIDTwo) {
    //     hasSecondDID = true;
    //   }
    // });
    // expect(hasFirstDID && hasSecondDID).toBe(true);
  }, 40000);

  test('Can create a registry with a OneOf policy', async () => {
    const a = await dock.revocation.newRegistry(
      registryId,
      policy,
      false,
      false,
    );
    expect(a).toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke from a registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await expect(
      dock.revocation.revoke(
        registryId,
        revokeIds,
        lastModified,
        didKeys,
        false,
      ),
    ).resolves.toBeDefined();

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can unrevoke from a registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await dock.revocation.unrevoke(
      registryId,
      revokeIds,
      lastModified,
      didKeys,
      false,
    );

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(false);
  }, 40000);

  test('Can remove a registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await dock.revocation.removeRegistry(
      registryId,
      lastModified,
      didKeys,
      false,
    );
    await expect(dock.revocation.getRegistryDetail(registryId)).rejects.toThrow(
      /Could not find revocation registry/,
    );
  }, 40000);

  test('Can create an add only registry', async () => {
    await expect(
      dock.revocation.newRegistry(registryId, policy, true, false),
    ).resolves.toBeDefined();
    const reg = await dock.revocation.getRevocationRegistry(registryId);
    expect(!!reg).toBe(true);
  }, 40000);

  test('Can revoke from an add only registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await dock.revocation.revoke(
      registryId,
      revokeIds,
      lastModified,
      didKeys,
      false,
    );

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not unrevoke from an add only registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await expect(
      dock.revocation.unrevoke(
        registryId,
        revokeIds,
        lastModified,
        didKeys,
        false,
      ),
    ).rejects.toThrow();

    const revocationStatus = await dock.revocation.getIsRevoked(
      registryId,
      revokeId,
    );
    expect(revocationStatus).toBe(true);
  }, 40000);

  test('Can not remove an add only registry', async () => {
    const registryDetail = await dock.revocation.getRegistryDetail(registryId);
    expect(!!registryDetail).toBe(true);

    const lastModified = registryDetail[1];
    await expect(
      dock.revocation.removeRegistry(registryId, lastModified, didKeys, false),
    ).rejects.toThrow();
    await expect(
      dock.revocation.getRegistryDetail(registryId),
    ).resolves.toBeDefined();
  }, 40000);
});
