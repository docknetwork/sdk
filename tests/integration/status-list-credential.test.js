import { randomAsHex } from "@polkadot/util-crypto";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableStatusListTests
} from "../test-constants";
import { DockAPI } from "../../src/index";
import defaultDocumentLoader from "../../src/utils/vc/document-loader";
import {
  issueCredential,
  signPresentation,
  verifyCredential,
  verifyPresentation,
  expandJSONLD,
} from "../../src/utils/vc/index";

import { DockResolver } from "../../src/resolver";
import { createPresentation } from "../create-presentation";

import { OneOfPolicy } from "../../src/utils/revocation";
import { DockStatusList2021Qualifier } from "../../src/utils/vc/constants";
import { getUnsignedCred, registerNewDIDUsingPair } from "./helpers";
import { getKeyDoc }from "../../src/utils/vc/helpers";
import { createNewDockDID } from "../../src/utils/did";
import StatusList2021Credential from "../../src/status-list-credential/status-list2021-credential";

const credId = "A large credential id with size > 32 bytes";

function addCredentialStatus(
  cred,
  statusListCredentialId,
  statusListCredentialIndex
) {
  return {
    ...cred,
    credentialStatus: {
      id: `${DockStatusList2021Qualifier}${statusListCredentialId}#${statusListCredentialIndex}`,
      type: "StatusList2021Entry",
      statusListIndex: String(statusListCredentialIndex),
      statusListCredential: `${DockStatusList2021Qualifier}${statusListCredentialId}`,
      statusPurpose: "suspension",
    },
  };
}

const buildTest = DisableStatusListTests
  ? describe.skip
  : describe;

buildTest("StatusList2021Credential", () => {
  const dockAPI = new DockAPI();
  const resolver = new DockResolver(dockAPI);

  // Create a random status list id
  const statusListCredentialId = randomAsHex(32);
  const statusListCredentialIndex = (Math.random() * 10e3) | 0;

  // Register a new DID for issuer
  const issuerDID = createNewDockDID();
  const issuerSeed = randomAsHex(32);

  // Register a new DID for holder
  const holderDID = createNewDockDID();
  const holderSeed = randomAsHex(32);

  let issuerKey;
  let issuerKeyPair;
  let credential;
  let expanded;

  beforeAll(async () => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccountURI);
    dockAPI.setAccount(account);

    // Register issuer DID
    issuerKeyPair = dockAPI.keyring.addFromUri(issuerSeed, null, "ed25519");
    await registerNewDIDUsingPair(dockAPI, issuerDID, issuerKeyPair);

    // Register holder DID
    const pair1 = dockAPI.keyring.addFromUri(holderSeed, null, "ed25519");
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    // Create a new policy
    const policy = new OneOfPolicy();
    policy.addOwner(issuerDID);
    issuerKey = getKeyDoc(
      issuerDID,
      issuerKeyPair,
      "Ed25519VerificationKey2018"
    );

    const statusListCred = await StatusList2021Credential.create(
      issuerKey,
      statusListCredentialId,
      { statusPurpose: "suspension" }
    );

    // Add a new revocation status list with above policy
    await dockAPI.statusListCredentialModule.createStatusListCredential(
      statusListCredentialId,
      statusListCred,
      policy
    );

    let unsignedCred = getUnsignedCred(credId, holderDID, [
      "https://w3id.org/vc/status-list/2021/v1",
    ]);

    // Issuer issues the credential with a given status list id for revocation
    unsignedCred = addCredentialStatus(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex
    );

    credential = await issueCredential(
      issuerKey,
      unsignedCred,
      void 0,
      defaultDocumentLoader(resolver),
    );

    expanded = await expandJSONLD(credential);
  }, 60000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 10000);

  test("Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails", async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });

    expect(result.verified).toBe(true);

    // Revoke the credential
    const fetchedCred =
      await dockAPI.statusListCredentialModule.fetchStatusList2021Credential(
        statusListCredentialId
      );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredentialModule.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      1,
      dockAPI
    );

    // The credential verification should fail as the credential has been revoked.
    const result1 = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });

    expect(result1.verified).toBe(false);
    expect(result1.error).toBe(
      "Credential was revoked (or suspended) according to the status list referenced in `credentialStatus`"
    );
  }, 50000);

  test("Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails", async () => {
    // The previous test revokes credential so unsuspend it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    let fetchedCred =
      await dockAPI.statusListCredentialModule.fetchStatusList2021Credential(
        statusListCredentialId
      );
    await fetchedCred.update(issuerKey, {
      unsuspendIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredentialModule.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      1,
      dockAPI
    );
    const holderKey = getKeyDoc(
      holderDID,
      dockAPI.keyring.addFromUri(holderSeed, null, "ed25519"),
      "Ed25519VerificationKey2018"
    );

    // Create presentation for unsuspended credential
    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = "test domain";
    const presentation = createPresentation(credential, presId);
    const signedPres = await signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver
    );

    // As the credential is unsuspended, the presentation should verify successfully.
    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(result.verified).toBe(true);

    // Revoke credential
    fetchedCred =
      await dockAPI.statusListCredentialModule.fetchStatusList2021Credential(
        statusListCredentialId
      );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredentialModule.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      1,
      dockAPI
    );

    // As the credential is revoked, the presentation should verify successfully.
    const result1 = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(result1.verified).toBe(false);
  }, 60000);
});
