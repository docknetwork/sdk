import { randomAsHex } from "@docknetwork/credential-sdk/utils";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../test-constants";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import defaultDocumentLoader from "@docknetwork/credential-sdk/vc/document-loader";
import {
  issueCredential,
  signPresentation,
  verifyCredential,
  verifyPresentation,
} from "@docknetwork/credential-sdk/vc";

import { CoreResolver } from "@docknetwork/credential-sdk/resolver";
import { createPresentation } from "../create-presentation";

import { DockCoreModules } from "../../src";
import { getUnsignedCred, registerNewDIDUsingPair } from "./helpers";
import { getKeyDoc } from "@docknetwork/credential-sdk/vc/helpers";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { DockStatusList2021Credential, DockStatusListCredentialId } from "@docknetwork/credential-sdk/types";
import { addStatusList21EntryToCredential } from "@docknetwork/credential-sdk/vc/credentials";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";

const credId = "A large credential id with size > 32 bytes";

describe("DockStatusList2021Credential", () => {
  const dockAPI = new DockAPI();
  const modules = new DockCoreModules(dockAPI);
  const resolver = new CoreResolver(modules);

  // Create a random status list id
  const statusListCredentialId = String(DockStatusListCredentialId.random());
  const statusListCredentialIndex = (Math.random() * 10e3) | 0;

  // Register a new DID for issuer
  const issuerDID = DockDid.random();
  const issuerSeed = randomAsHex(32);

  // Register a new DID for holder
  const holderDID = DockDid.random();
  const holderSeed = randomAsHex(32);

  let issuerKey;
  let issuerKeyPair;
  let credential;

  beforeAll(async () => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccountURI);
    dockAPI.setAccount(account);

    // Register issuer DID
    issuerKeyPair = new DidKeypair(
      [issuerDID, 1],
      new Ed25519Keypair(issuerSeed)
    );
    await registerNewDIDUsingPair(dockAPI, issuerDID, issuerKeyPair);

    // Register holder DID
    const pair1 = new DidKeypair(
      [holderDID, 1],
      new Ed25519Keypair(holderSeed)
    );
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    // Create a new policy
    issuerKey = getKeyDoc(
      issuerDID,
      issuerKeyPair,
      "Ed25519VerificationKey2018"
    );

    const statusListCred = await DockStatusList2021Credential.create(
      issuerKey,
      statusListCredentialId,
      { statusPurpose: "suspension" }
    );

    // Add a new revocation status list with above policy
    await modules.statusListCredential.createStatusListCredential(
      statusListCredentialId,
      statusListCred,
      issuerKeyPair
    );

    let unsignedCred = getUnsignedCred(credId, holderDID, [
      "https://w3id.org/vc/status-list/2021/v1",
    ]);

    expect(() =>
      addStatusList21EntryToCredential(
        unsignedCred,
        statusListCredentialId,
        statusListCredentialIndex,
        "wrongPurpose"
      )
    ).toThrow();

    // Issuer issues the credential with a given status list id for revocation
    unsignedCred = addStatusList21EntryToCredential(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex,
      "suspension"
    );

    credential = await issueCredential(
      issuerKey,
      unsignedCred,
      void 0,
      defaultDocumentLoader(resolver)
    );
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

    console.log(result.error);
    expect(result.verified).toBe(true);

    // Revoke the credential
    const fetchedCred =
      await modules.statusListCredential.getStatusListCredential(
        statusListCredentialId
      );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await modules.statusListCredential.updateStatusListCredential(
      statusListCredentialId,
      fetchedCred,
      issuerKeyPair
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
      await modules.statusListCredential.getStatusListCredential(
        statusListCredentialId
      );
    await fetchedCred.update(issuerKey, {
      unsuspendIndices: [statusListCredentialIndex],
    });

    await modules.statusListCredential.updateStatusListCredential(
      statusListCredentialId,
      fetchedCred,
      issuerKeyPair
    );
    const holderKey = getKeyDoc(
      holderDID,
      new Ed25519Keypair(holderSeed),
      "Ed25519VerificationKey2018"
    );

    // Create presentation for unsuspended credential
    const presId = `https://pres.com/${randomAsHex(32)}`;
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
    fetchedCred = await modules.statusListCredential.getStatusListCredential(
      statusListCredentialId
    );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await modules.statusListCredential.updateStatusListCredential(
      statusListCredentialId,
      fetchedCred,
      issuerKeyPair
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
