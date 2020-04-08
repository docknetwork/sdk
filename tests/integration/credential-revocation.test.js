import {randomAsHex} from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import {Ed25519KeyPair} from 'jsonld-signatures';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {DockAPI} from '../../src/api';
import VerifiableCredentialModule, {DockRevRegQualifier, RevRegType} from '../../src/modules/vc';
import Resolver from '../../src/resolver';

import {
  createOneOfPolicyRevRegOnChain,
  KeyringPairDidKeys, revokeCredential, unrevokeCredential,
} from '../../src/utils/revocation';
import {
  getUnsignedCred,
  registerNewDIDUsingPair
} from './helpers';
import {getKeyDoc} from '../../src/utils/vc/helpers';
import {createNewDockDID} from '../../src/utils/did';

const vc = new VerifiableCredentialModule();

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

    await createOneOfPolicyRevRegOnChain(dockAPI, issuerDID, registryId, false);

    // Set our owner DID and associated keypair to be used for generating proof
    //didKeys.set(getHexIdentifierFromDID(issuerDID), pair);
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
    credential = await vc.issueCredential(issuerKey, unsignedCred);

    done();
  }, 30000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 30000);

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await vc.verifyCredential(credential, resolver, true, {'dock': dockAPI});
    expect(result.verified).toBe(true);

    // Revoke the credential
    const revId = VerifiableCredentialModule.getDockRevIdFromCredential(credential);
    await revokeCredential(dockAPI, didKeys, registryId, revId);

    // The credential verification should fail as the credential has been revoked.
    const result1 = await vc.verifyCredential(credential, resolver, true, {'dock': dockAPI});
    expect(result1.verified).toBe(false);
    expect(result1.error).toBe('Revocation check failed');

  }, 40000);

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    // The previous test revokes credential so unrevoke it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    const revId = VerifiableCredentialModule.getDockRevIdFromCredential(credential);
    await unrevokeCredential(dockAPI, didKeys, registryId, revId);

    const holderKey = getKeyDoc(holderDID, await Ed25519KeyPair.generate({seed: hexToU8a(holderSeed)}), 'Ed25519VerificationKey2018');

    // Create presentation for unrevoked credential
    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = vc.createPresentation(
      credential,
      presId
    );
    const signedPres = await vc.signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver,
    );

    // As the credential is unrevoked, the presentation should verify successfully.
    const result = await vc.verifyPresentation(
      signedPres,
      chal,
      domain,
      resolver,
      true,
      {'dock': dockAPI}
    );
    expect(result.verified).toBe(true);

    // Revoke credential
    await revokeCredential(dockAPI, didKeys, registryId, revId);

    // As the credential is revoked, the presentation should verify successfully.
    const result1 = await vc.verifyPresentation(
      signedPres,
      chal,
      domain,
      resolver,
      true,
      {'dock': dockAPI}
    );
    expect(result1.verified).toBe(false);

  }, 40000);
});

