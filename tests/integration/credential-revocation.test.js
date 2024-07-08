import { randomAsHex } from '@polkadot/util-crypto';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../test-constants';
import { DockAPI } from '../../src/index';
import {
  issueCredential,
  signPresentation,
  verifyCredential,
  verifyPresentation,
  expandJSONLD,
} from '../../src/utils/vc/index';

import { DockResolver } from '../../src/resolver';
import { createPresentation } from '../create-presentation';

import {
  OneOfPolicy,
  getDockRevIdFromCredential,
} from '../../src/utils/revocation';
import { getUnsignedCred, registerNewDIDUsingPair } from './helpers';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import {
  DockDid,
  DidKeypair,
  DockDidOrDidMethodKey,
} from '../../src/did';
import {
  addRevRegIdToCredential,
  getPrivateStatus,
} from '../../src/utils/vc/credentials';
import { getPrivateStatuses } from '../../src/utils/vc/presentations';

const credId = 'A large credential id with size > 32 bytes';

describe('Credential revocation with issuer as the revocation authority', () => {
  const dockAPI = new DockAPI();
  const resolver = new DockResolver(dockAPI);

  // Create a random registry id
  const registryId = randomAsHex(32);

  // Register a new DID for issuer
  const issuerDID = DockDid.random();
  const issuerSeed = randomAsHex(32);

  // Register a new DID for holder
  const holderDID = DockDid.random();
  const holderSeed = randomAsHex(32);

  let issuerKey;
  let issuerKeyPair;
  let credential;
  let expanded;
  let revId;

  beforeAll(async () => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccountURI);
    dockAPI.setAccount(account);

    // Register issuer DID
    issuerKeyPair = DidKeypair.fromApi(dockAPI, { seed: issuerSeed });
    await registerNewDIDUsingPair(dockAPI, issuerDID, issuerKeyPair);

    // Register holder DID
    const pair1 = DidKeypair.fromApi(dockAPI, { seed: holderSeed });
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    // Create a new policy
    const policy = new OneOfPolicy();
    policy.addOwner(DockDidOrDidMethodKey.from(issuerDID));

    // Add a new revocation registry with above policy
    await dockAPI.revocation.newRegistry(registryId, policy, false, false);

    let unsignedCred = getUnsignedCred(credId, holderDID);

    // Issuer issues the credential with a given registry id for revocation
    unsignedCred = addRevRegIdToCredential(unsignedCred, registryId);

    issuerKey = getKeyDoc(
      issuerDID,
      issuerKeyPair,
      'Ed25519VerificationKey2018',
    );
    credential = await issueCredential(issuerKey, unsignedCred);

    expanded = await expandJSONLD(credential);
    revId = getDockRevIdFromCredential(expanded);
  }, 60000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 10000);

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });
    expect(result.verified).toBe(true);
    expect(getPrivateStatus(credential)).not.toBeDefined();

    // Revoke the credential
    await dockAPI.revocation.revokeCredentialWithOneOfPolicy(
      registryId,
      revId,
      issuerDID,
      issuerKeyPair,
      { didModule: dockAPI.did },
      false,
    );

    // The credential verification should fail as the credential has been revoked.
    const result1 = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });

    expect(result1.verified).toBe(false);
    expect(result1.error).toBe('Revocation check failed');
  }, 50000);

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    // The previous test revokes credential so unrevoke it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    await dockAPI.revocation.unrevokeCredentialWithOneOfPolicy(
      registryId,
      revId,
      issuerDID,
      issuerKeyPair,
      { didModule: dockAPI.did },
      false,
    );

    const holderKey = getKeyDoc(
      holderDID,
      dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );

    // Create presentation for unrevoked credential
    const presId = `https://pres.com/${randomAsHex(32)}`;
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(credential, presId);
    const signedPres = await signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver,
    );

    // As the credential is unrevoked, the presentation should verify successfully.
    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(result.verified).toBe(true);
    expect(getPrivateStatuses(signedPres)[0]).not.toBeDefined();

    // Revoke credential
    await dockAPI.revocation.revokeCredentialWithOneOfPolicy(
      registryId,
      revId,
      issuerDID,
      issuerKeyPair,
      { didModule: dockAPI.did },
      false,
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
