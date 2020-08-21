import { randomAsHex } from '@polkadot/util-crypto';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { DockAPI } from '../../src/api';
import {
  createPresentation,
  DockRevRegQualifier, getDockRevIdFromCredential, issueCredential,
  RevRegType,
  signPresentation, verifyCredential,
  verifyPresentation,
  expandJSONLD,
} from '../../src/utils/vc';
import { DockResolver } from '../../src/resolver';

import {
  KeyringPairDidKeys, OneOfPolicy,
} from '../../src/utils/revocation';
import {
  getUnsignedCred,
  registerNewDIDUsingPair,
} from './helpers';
import getKeyDoc from '../../src/utils/vc/helpers';
import { createNewDockDID } from '../../src/utils/did';

const credId = 'A large credential id with size > 32 bytes';

function addRevRegIdToCred(cred, regId) {
  const newCred = { ...cred };
  newCred.credentialStatus = {
    id: `${DockRevRegQualifier}${regId}`,
    type: RevRegType,
  };
  return newCred;
}

describe('Credential revocation with issuer as the revocation authority', () => {
  const dockAPI = new DockAPI();
  const resolver = new DockResolver(dockAPI);

  // Create a random registry id
  const registryId = randomAsHex(32);

  // Register a new DID for issuer
  const issuerDID = createNewDockDID();
  const issuerSeed = randomAsHex(32);

  // Register a new DID for holder
  const holderDID = createNewDockDID();
  const holderSeed = randomAsHex(32);

  // Create a did/keypair proof map
  const didKeys = new KeyringPairDidKeys();

  let issuerKey;
  let credential;
  let expanded;
  let revId;

  beforeAll(async (done) => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccountURI);
    dockAPI.setAccount(account);

    // Register issuer DID
    const pair = dockAPI.keyring.addFromUri(issuerSeed, null, 'ed25519');
    await registerNewDIDUsingPair(dockAPI, issuerDID, pair);

    // Register holder DID
    const pair1 = dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519');
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    // Create a new policy
    const policy = new OneOfPolicy();
    policy.addOwner(issuerDID);

    // Add a new revocation registry with above policy
    await dockAPI.revocation.newRegistry(registryId, policy, false);

    // Set our owner DID and associated keypair to be used for generating proof
    didKeys.set(issuerDID, pair);

    let unsignedCred = getUnsignedCred(credId, holderDID);

    // Issuer issues the credential with a given registry id for revocation
    unsignedCred = addRevRegIdToCred(unsignedCred, registryId);

    issuerKey = getKeyDoc(issuerDID, dockAPI.keyring.addFromUri(issuerSeed, null, 'ed25519'), 'Ed25519VerificationKey2018');
    credential = await issueCredential(issuerKey, unsignedCred);

    expanded = await expandJSONLD(credential);
    revId = getDockRevIdFromCredential(expanded);

    done();
  }, 60000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 10000);

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await verifyCredential(credential, {
      resolver,
      compactProof: true,
      forceRevocationCheck: true,
      revocationApi: { dock: dockAPI },
    });

    expect(result.verified).toBe(true);

    // Revoke the credential
    await dockAPI.revocation.revokeCredential(didKeys, registryId, revId);

    // The credential verification should fail as the credential has been revoked.
    const result1 = await verifyCredential(credential, {
      resolver,
      compactProof: true,
      forceRevocationCheck: true,
      revocationApi: { dock: dockAPI },
    });
    expect(result1.verified).toBe(false);
    expect(result1.error).toBe('Revocation check failed');
  }, 50000);

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    // The previous test revokes credential so unrevoke it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    await dockAPI.revocation.unrevokeCredential(didKeys, registryId, revId);

    const holderKey = getKeyDoc(holderDID, dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519'), 'Ed25519VerificationKey2018');

    // Create presentation for unrevoked credential
    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(
      credential,
      presId,
    );
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
      forceRevocationCheck: false,
      revocationApi: { dock: dockAPI },
    });
    expect(result.verified).toBe(true);

    // Revoke credential
    await dockAPI.revocation.revokeCredential(didKeys, registryId, revId);

    // As the credential is revoked, the presentation should verify successfully.
    const result1 = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
      forceRevocationCheck: false,
      revocationApi: { dock: dockAPI },
    });
    expect(result1.verified).toBe(false);
  }, 60000);
});
