import {randomAsHex} from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import {Ed25519KeyPair} from 'jsonld-signatures';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {DockAPI} from '../../src/api';
import {
  createPresentation,
  DockRevRegQualifier, getDockRevIdFromCredential, issueCredential,
  RevRegType,
  signPresentation, verifyCredential,
  verifyPresentation
} from '../../src/utils/vc';
import Resolver from '../../src/resolver';

import {
  KeyringPairDidKeys, OneOfPolicy
} from '../../src/utils/revocation';
import {
  getUnsignedCred,
  registerNewDIDUsingPair
} from './helpers';
import {getKeyDoc} from '../../src/utils/vc/helpers';
import {createNewDockDID} from '../../src/utils/did';

const credId = 'A large credential id with size > 32 bytes';
let resolver;

function addRevRegIdToCred(cred, regId) {
  cred.credentialStatus = {
    id: `${DockRevRegQualifier}${regId}`,
    type: RevRegType
  };
}

describe('Credential revocation with issuer as the revocation authority', () => {
  const dockAPI = new DockAPI(FullNodeEndpoint);

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

  beforeAll(async (done) => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccount.uri, TestAccount.options);
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
    const transaction = dockAPI.revocation.newRegistry(registryId, policy, false);
    await dockAPI.sendTransaction(transaction);

    // Set our owner DID and associated keypair to be used for generating proof
    didKeys.set(issuerDID, pair);

    const providers = {
      'dock': FullNodeEndpoint,
    };
    resolver = new Resolver(providers);
    resolver.init();

    const unsignedCred = getUnsignedCred(credId, holderDID);

    // Issuer issues the credential with a given registry id for revocation
    addRevRegIdToCred(unsignedCred, registryId);
    issuerKey = getKeyDoc(issuerDID, await Ed25519KeyPair.generate({seed: hexToU8a(issuerSeed)}), 'Ed25519VerificationKey2018');
    credential = await issueCredential(issuerKey, unsignedCred);

    done();
  }, 30000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 30000);

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await verifyCredential(credential, resolver, true, false, {'dock': dockAPI});
    expect(result.verified).toBe(true);

    // Revoke the credential
    const revId = getDockRevIdFromCredential(credential);
    const t1 = await dockAPI.revocation.revokeCredential(didKeys, registryId, revId);
    await dockAPI.sendTransaction(t1);

    // The credential verification should fail as the credential has been revoked.
    const result1 = await verifyCredential(credential, resolver, true, false, {'dock': dockAPI});
    expect(result1.verified).toBe(false);
    expect(result1.error).toBe('Revocation check failed');

  }, 40000);

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    // The previous test revokes credential so unrevoke it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    const revId = getDockRevIdFromCredential(credential);
    const t2 = await dockAPI.revocation.unrevokeCredential(didKeys, registryId, revId);
    await dockAPI.sendTransaction(t2);

    const holderKey = getKeyDoc(holderDID, await Ed25519KeyPair.generate({seed: hexToU8a(holderSeed)}), 'Ed25519VerificationKey2018');

    // Create presentation for unrevoked credential
    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(
      credential,
      presId
    );
    const signedPres = await signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver,
    );

    // As the credential is unrevoked, the presentation should verify successfully.
    const result = await verifyPresentation(
      signedPres,
      chal,
      domain,
      resolver,
      true,
      false,
      {'dock': dockAPI}
    );
    expect(result.verified).toBe(true);

    // Revoke credential
    const t3 = await dockAPI.revocation.revokeCredential(didKeys, registryId, revId);
    await dockAPI.sendTransaction(t3);

    // As the credential is revoked, the presentation should verify successfully.
    const result1 = await verifyPresentation(
      signedPres,
      chal,
      domain,
      resolver,
      true,
      false,
      {'dock': dockAPI}
    );
    expect(result1.verified).toBe(false);

  }, 40000);
});

