import { randomAsHex } from "@polkadot/util-crypto";

import { DockAPI } from "../../src/index";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableStatusListTests,
} from "../test-constants";

import {
  typedHexDID,
  createNewDockDID,
  DidKeypair,
  typedHexDIDFromSubstrate,
} from "../../src/utils/did";
import { OneOfPolicy } from "../../src/utils/revocation";
import { registerNewDIDUsingPair } from "./helpers";
import { getKeyDoc } from "../../src/utils/vc/helpers";
import StatusList2021Credential from "../../src/status-list-credential/status-list2021-credential";

const expectEqualCreds = (cred1, cred2) => {
  expect(cred1).toEqual(cred2);
  expect(cred1.toJSON()).toEqual(cred2.toJSON());
  expect(StatusList2021Credential.fromJSON(cred1.toJSON())).toEqual(
    StatusList2021Credential.fromJSON(cred2.toJSON())
  );
};
const buildTest = DisableStatusListTests ? describe.skip : describe;

buildTest("StatusListCredential Module", () => {
  const dock = new DockAPI();
  let pair;
  let pair2;

  // Create a random status list id
  const statusListCredId = randomAsHex(32);
  // Create a random status list id
  const multipleControllerstatusListCredID = randomAsHex(32);

  // Create a new owner DID, the DID will be registered on the network and own the status list
  const ownerDID = createNewDockDID();
  const ownerSeed = randomAsHex(32);
  let ownerKey;

  const ownerDID2 = createNewDockDID();
  const ownerSeed2 = randomAsHex(32);
  let ownerKey2;

  // Create  owners
  const owners = new Set();
  let policy;

  // Create revoke IDs
  const revokeId = (Math.random() * 10e3) | 0;
  const revokeIds = new Set();
  revokeIds.add(revokeId);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // Create a status list policy
    owners.add(typedHexDID(dock.api, ownerDID));

    policy = new OneOfPolicy(owners);

    ownerKey = getKeyDoc(
      ownerDID,
      dock.keyring.addFromUri(ownerSeed, null, "ed25519"),
      "Ed25519VerificationKey2018"
    );

    ownerKey2 = getKeyDoc(
      ownerDID2,
      dock.keyring.addFromUri(ownerSeed2, null, "ed25519"),
      "Ed25519VerificationKey2018"
    );

    // The keyring should be initialized before any test begins as this suite is testing statusListCredentialModule
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Thees DIDs should be written before any test begins
    pair = new DidKeypair(
      dock.keyring.addFromUri(ownerSeed, null, "sr25519"),
      1
    );
    pair2 = new DidKeypair(
      dock.keyring.addFromUri(ownerSeed2, null, "sr25519"),
      1
    );

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, ownerDID, pair);
    // Register secondary DID
    await registerNewDIDUsingPair(dock, ownerDID2, pair2);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test("Can create a status list with a OneOf policy", async () => {
    const cred = await StatusList2021Credential.create(
      ownerKey,
      statusListCredId
    );
    await expect(
      dock.statusListCredential.createStatusListCredential(
        statusListCredId,
        cred,
        policy,
        false
      )
    ).resolves.toBeDefined();
    const fetchedCred =
      await dock.statusListCredential.fetchStatusList2021Credential(
        statusListCredId
      );
    expectEqualCreds(cred, fetchedCred);
  }, 40000);

  test("Can revoke index from a status list credential", async () => {
    const cred = await dock.statusListCredential.fetchStatusList2021Credential(
      statusListCredId
    );
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    const [revoke, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        cred,
        ownerDID,
        pair,
        { didModule: dock.did }
      );
    await dock.statusListCredential.updateStatusListCredential(
      revoke,
      [{ nonce, sig }],
      false
    );
    const fetchedCred =
      await dock.statusListCredential.fetchStatusList2021Credential(
        statusListCredId
      );
    expectEqualCreds(cred, fetchedCred);
    expect(await fetchedCred.revoked(revokeId)).toBe(true);
  }, 40000);

  test("Cant unsuspend from a status list credential with `statusPurpose` = `revocation`", async () => {
    const cred = await dock.statusListCredential.fetchStatusList2021Credential(
      statusListCredId
    );
    expect(
      cred.update(ownerKey, { unsuspendIndices: revokeIds })
    ).rejects.toEqual(
      new Error(
        "Can't unsuspend indices for credential with `statusPurpose` = `revocation`, it's only possible with `statusPurpose` = `suspension`"
      )
    );
    expect(
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
    let [update, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        credential,
        ownerDID,
        pair,
        { didModule: dock.did }
      );
    await dock.statusListCredential.updateStatusListCredential(
      update,
      [{ nonce, sig }],
      false
    );
    let fetchedCred =
      await dock.statusListCredential.fetchStatusList2021Credential(
        statusListCredId
      );
    expectEqualCreds(credential, fetchedCred);
    await fetchedCred.update(ownerKey, { unsuspendIndices: revokeIds });
    expect(await fetchedCred.revokedBatch(revokeIds)).toEqual(
      Array.from(revokeIds, () => false)
    );
    [update, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        fetchedCred,
        ownerDID,
        pair,
        { didModule: dock.did }
      );
    await dock.statusListCredential.updateStatusListCredential(
      update,
      [{ nonce, sig }],
      false
    );

    fetchedCred = await dock.statusListCredential.fetchStatusList2021Credential(
      statusListCredId
    );
    expect(await fetchedCred.revoked(revokeId)).toBe(false);
  }, 40000);

  test("Can remove a status list", async () => {
    const [remove, sig, nonce] =
      await dock.statusListCredential.createSignedRemoveStatusListCredential(
        statusListCredId,
        ownerDID,
        pair,
        { didModule: dock.did }
      );
    await dock.statusListCredential.removeStatusListCredential(
      remove,
      [{ nonce, sig }],
      false
    );
    expect(
      await dock.statusListCredential.fetchStatusList2021Credential(
        statusListCredId
      )
    ).toBe(null);
  }, 40000);

  test("Can create a status list with multiple owners", async () => {
    const controllersNew = new Set();
    controllersNew.add(typedHexDID(dock.api, ownerDID));
    controllersNew.add(typedHexDID(dock.api, ownerDID2));

    const cred = await StatusList2021Credential.create(
      ownerKey,
      multipleControllerstatusListCredID,
      { statusPurpose: "suspension" }
    );

    // Create policy and status list with multiple owners
    const policyNew = new OneOfPolicy(controllersNew);
    await expect(
      dock.statusListCredential.createStatusListCredential(
        multipleControllerstatusListCredID,
        cred,
        policyNew,
        false,
        false
      )
    ).resolves.toBeDefined();
    const fetchedCred = (
      await dock.api.query.statusListCredential.statusListCredentials(
        multipleControllerstatusListCredID
      )
    ).unwrap();
    expect(fetchedCred.policy.isOneOf).toBe(true);

    const controllerSet = fetchedCred.policy.asOneOf;
    expect(controllerSet.toJSON().length).toBe(2);

    let hasFirstDID = false;
    let hasSecondDID = false;
    [...controllerSet.entries()]
      .flatMap((v) => v)
      .map(cnt => typedHexDIDFromSubstrate(dock.api, cnt))
      .forEach((controller) => {
        if (
          controller.toString() === typedHexDID(dock.api, ownerDID).toString()
        ) {
          hasFirstDID = true;
        } else if (
          controller.toString() === typedHexDID(dock.api, ownerDID2).toString()
        ) {
          hasSecondDID = true;
        }
      });
    expect(hasFirstDID && hasSecondDID).toBe(true);
  }, 40000);

  test("Can revoke, unsuspend and remove status list with multiple owners", async () => {
    const revId = (Math.random() * 10e3) | 0;

    let fetchedCred =
      await dock.statusListCredential.fetchStatusList2021Credential(
        multipleControllerstatusListCredID
      );
    await fetchedCred.update(ownerKey, { revokeIndices: [revId] });
    // Revoke
    await dock.statusListCredential.updateStatusListCredentialWithOneOfPolicy(
      multipleControllerstatusListCredID,
      fetchedCred,
      ownerDID,
      pair,
      { didModule: dock.did },
      false
    );
    fetchedCred = await dock.statusListCredential.fetchStatusList2021Credential(
      multipleControllerstatusListCredID,
      revId
    );
    expect(await fetchedCred.revoked(revId)).toBe(true);

    await fetchedCred.update(ownerKey2, { unsuspendIndices: [revId] });

    // Unrevoke from another DID
    await dock.statusListCredential.updateStatusListCredentialWithOneOfPolicy(
      multipleControllerstatusListCredID,
      fetchedCred,
      ownerDID2,
      pair2,
      { didModule: dock.did },
      false
    );
    fetchedCred = await dock.statusListCredential.fetchStatusList2021Credential(
      multipleControllerstatusListCredID
    );
    expect(await fetchedCred.revoked(revId)).toBe(false);

    // Remove
    await dock.statusListCredential.removeStatusListCredentialWithOneOfPolicy(
      multipleControllerstatusListCredID,
      ownerDID,
      pair,
      { didModule: dock.did },
      false
    );
    fetchedCred = await dock.statusListCredential.fetchStatusList2021Credential(
      multipleControllerstatusListCredID
    );
    expect(fetchedCred).toBe(null);
  }, 30000);
});
