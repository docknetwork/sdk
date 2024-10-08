import { randomAsHex } from "@docknetwork/credential-sdk/utils";

import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockCoreModules } from "../../src";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../test-constants";

import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { registerNewDIDUsingPair } from "./helpers";
import { getKeyDoc } from "@docknetwork/credential-sdk/vc/helpers";
import { StatusList2021Credential } from "@docknetwork/credential-sdk/types/status-list-credential";

const expectEqualCreds = (cred1, cred2) => {
  expect(cred1.eq(cred2)).toBe(true);
  expect(cred1.toJSON()).toEqual(cred2.toJSON());
  expect(StatusList2021Credential.fromJSON(cred1.toJSON())).toEqual(
    StatusList2021Credential.fromJSON(cred2.toJSON())
  );
};

describe("StatusListCredential Module", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);
  let pair;

  // Create a random status list id
  const statusListCredId = randomAsHex(32);
  // Create a random status list id
  const multipleControllerstatusListCredID = randomAsHex(32);

  // Create a new owner DID, the DID will be registered on the network and own the status list
  const ownerDID = DockDid.random();
  const ownerSeed = randomAsHex(32);
  let ownerKey;

  // Create revoke IDs
  const revokeId = (Math.random() * 10e3) | 0;
  const revokeIds = new Set();
  revokeIds.add(revokeId);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    ownerKey = getKeyDoc(
      ownerDID,
      new Ed25519Keypair(ownerSeed),
      "Ed25519VerificationKey2018"
    );

    // The keyring should be initialized before any test begins as this suite is testing statusListCredentialModule
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Thees DIDs should be written before any test begins
    pair = new DidKeypair([ownerDID, 1], new Ed25519Keypair(ownerSeed));

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, ownerDID, pair);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test("Can create a status list with a OneOf policy", async () => {
    const cred = await StatusList2021Credential.create(
      ownerKey,
      statusListCredId,
      {}
    );
    await expect(
      modules.statusListCredential.createStatusListCredential(
        statusListCredId,
        cred,
        ownerDID,
        pair
      )
    ).resolves.toBeDefined();
    const fetchedCred =
      await modules.statusListCredential.getStatusListCredential(
        statusListCredId
      );
    expectEqualCreds(cred, fetchedCred);
  }, 40000);

  test("Can revoke index from a status list credential", async () => {
    const cred = await modules.statusListCredential.getStatusListCredential(
      statusListCredId
    );
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    await modules.statusListCredential.updateStatusListCredential(
      statusListCredId,
      cred,
      ownerDID,
      pair
    );
    const fetchedCred =
      await modules.statusListCredential.getStatusListCredential(
        statusListCredId
      );
    expectEqualCreds(cred, fetchedCred);
    expect(await fetchedCred.revoked(revokeId)).toBe(true);
  }, 40000);

  test("Cant unsuspend from a status list credential with `statusPurpose` = `revocation`", async () => {
    const cred = await modules.statusListCredential.getStatusListCredential(
      statusListCredId
    );
    await expect(
      cred.update(ownerKey, { unsuspendIndices: revokeIds })
    ).rejects.toEqual(
      new Error(
        "Can't unsuspend indices for credential with `statusPurpose` = `revocation`, it's only possible with `statusPurpose` = `suspension`"
      )
    );
    await expect(
      cred.update(ownerKey, { unsuspendIndices: revokeIds })
    ).rejects.toEqual(
      new Error(
        "Can't unsuspend indices for credential with `statusPurpose` = `revocation`, it's only possible with `statusPurpose` = `suspension`"
      )
    );
    expect(await cred.revokedBatch(revokeIds)).toEqual(
      Array.from(revokeIds, () => true)
    );
  }, 40000);

  test("Can unsuspend from a status list credential", async () => {
    const credential = await StatusList2021Credential.create(
      ownerKey,
      statusListCredId,
      { statusPurpose: "suspension", revokeIndices: revokeIds }
    );
    await modules.statusListCredential.updateStatusListCredential(
      statusListCredId,
      credential,
      ownerDID,
      pair
    );
    let fetchedCred =
      await modules.statusListCredential.getStatusListCredential(
        statusListCredId
      );
    expectEqualCreds(credential, fetchedCred);
    await fetchedCred.update(ownerKey, { unsuspendIndices: revokeIds });
    expect(await fetchedCred.revokedBatch(revokeIds)).toEqual(
      Array.from(revokeIds, () => false)
    );
    await modules.statusListCredential.updateStatusListCredential(
      statusListCredId,
      fetchedCred,
      ownerDID,
      pair
    );

    fetchedCred = await modules.statusListCredential.getStatusListCredential(
      statusListCredId
    );
    expect(await fetchedCred.revoked(revokeId)).toBe(false);
  }, 40000);

  test("Can remove a status list", async () => {
    await modules.statusListCredential.removeStatusListCredential(
      statusListCredId,
      ownerDID,
      pair
    );
    expect(
      await modules.statusListCredential.getStatusListCredential(
        statusListCredId
      )
    ).toBe(null);
  }, 40000);

  test("Can create a status list with multiple owners", async () => {
    const cred = await StatusList2021Credential.create(
      ownerKey,
      multipleControllerstatusListCredID,
      { statusPurpose: "suspension" }
    );

    await expect(
      modules.statusListCredential.createStatusListCredential(
        multipleControllerstatusListCredID,
        cred,
        ownerDID,
        pair
      )
    ).resolves.toBeDefined();
    const fetchedCred = (
      await dock.api.query.statusListCredential.statusListCredentials(
        multipleControllerstatusListCredID
      )
    ).unwrap();
    expect(fetchedCred.policy.isOneOf).toBe(true);

    const controllerSet = fetchedCred.policy.asOneOf;
    expect(controllerSet.toJSON().length).toBe(1);

    let hasFirstDID = false;
    [...controllerSet.entries()]
      .flatMap((v) => v)
      .map((cnt) => DockDid.from(cnt))
      .forEach((controller) => {
        if (controller.toString() === DockDid.from(ownerDID).toString()) {
          hasFirstDID = true;
        }
      });
    expect(hasFirstDID).toBe(true);
  }, 40000);
});
