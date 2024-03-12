import { randomAsHex } from '@polkadot/util-crypto';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableStatusListTests,
} from '../test-constants';
import { DockAPI } from '../../src/index';
import defaultDocumentLoader from '../../src/utils/vc/document-loader';
import {
  issueCredential,
  signPresentation,
  verifyCredential,
  verifyPresentation,
} from '../../src/utils/vc/index';

import { DockResolver } from '../../src/resolver';
import { createPresentation } from '../create-presentation';

import { OneOfPolicy } from '../../src/utils/revocation';
import { getUnsignedCred, registerNewDIDUsingPair } from './helpers';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import { createNewDockDID, DidKeypair, typedHexDID } from '../../src/utils/did';
import StatusList2021Credential from '../../src/status-list-credential/status-list2021-credential';
import { addStatusList21EntryToCredential } from '../../src/utils/vc/credentials';

const credId = 'A large credential id with size > 32 bytes';

const buildTest = DisableStatusListTests
  ? describe.skip
  : describe;

buildTest('StatusList2021Credential', () => {
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

  beforeAll(async () => {
    await dockAPI.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dockAPI.keyring.addFromUri(TestAccountURI);
    dockAPI.setAccount(account);

    // Register issuer DID
    issuerKeyPair = new DidKeypair(dockAPI.keyring.addFromUri(issuerSeed, null, 'ed25519'), 1);
    await registerNewDIDUsingPair(dockAPI, issuerDID, issuerKeyPair);

    // Register holder DID
    const pair1 = new DidKeypair(dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519'), 1);
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    // Create a new policy
    const policy = new OneOfPolicy();
    policy.addOwner(typedHexDID(dockAPI.api, issuerDID));
    issuerKey = getKeyDoc(
      issuerDID,
      issuerKeyPair,
      'Ed25519VerificationKey2018',
    );

    const statusListCred = await StatusList2021Credential.create(
      issuerKey,
      statusListCredentialId,
      { statusPurpose: 'suspension' },
      dockAPI.api,
    );

    // Add a new revocation status list with above policy
    await dockAPI.statusListCredential.createStatusListCredential(
      statusListCredentialId,
      statusListCred,
      policy,
    );

    let unsignedCred = getUnsignedCred(credId, holderDID, [
      'https://w3id.org/vc/status-list/2021/v1',
    ]);

    expect(() => addStatusList21EntryToCredential(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex,
      'wrongPurpose',
    )).toThrow();

    // Issuer issues the credential with a given status list id for revocation
    unsignedCred = addStatusList21EntryToCredential(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex,
      'suspension',
    );

    credential = await issueCredential(
      issuerKey,
      unsignedCred,
      void 0,
      defaultDocumentLoader(resolver),
    );
  }, 60000);

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 10000);

  test('Backward compatibility', async () => {
    const credential = StatusList2021Credential.fromBytes('0x1f8b0800000000000003b5925b739b301085ff0b7df505899be1a90ec194b8b143f0359d4c46480a16c6c88364639ac97fafb09bcb74fad6294fb06775cea75d5eb4af9897929ea4e6fdd03652ee85d7efd775ddab8d1eafb23ed4c1a08f2b4a6829192a44ff08b4ce47a3c1c8b9ed88fb42227910dd8209a94e41d0763e763446344ffba4b5924738de7afa09a6ba0d0de820dbc50302741b1060410be903dba09649b19d3a0e047aea126b9022d7754cd7709061519db844c78a44367bdaa22f68c59e194a0beabfc32a3939077fff9dfb4952641fb74a0e694eb11ac1cb7fc5fdd21abe33ffc1a6eab4c49c50d25694fccd14d1f0ed81932c1c2ef3f5880d377c046b3f5be7aa5c2c1abb9e46817a55e72fd877876acf451b50d123c748325e6aaf6a11421c5089e93592ada832cdae6e74019ce98e67b99e65f6ac017c503efb8af36735d4f250149d9737dc8040cb026ec2b252c554b4fd33b4f3149521f9bb63eb763c6fe6c2714be586b7bd8491cb54ad70b30a4c3c30278b6bb9dc9b61cc6bc266f36679c3b8f8198fc5edeaeefafe94cd8e599ce4f6972d6d4417bc517e5c160941ab4f191d2daf85aad3e6669386984dd9cde821b89fc54924a25d04277e643fec4602c3b9fa9e346815b36921d83a5feb5101dc5ecf91e06a3299eed639c7d2ec0ee757a75c84ab7817d2a7f92081603386e3f5d672223328a51b2cc1362015f2e3b041247bda051c8b459460ffee16d3ed38f3ab67d71f6aaf8f975dd0ea5fe6a0bdfe02c3273489bb030000', { specVersion: 53 });
    const decoded = await credential.decodeStatusList();
    const revoked = await credential.revokedBatch(Array.from({ length: decoded.length }, (_, idx) => idx));

    expect(decoded.length).toBe(1e4);
    expect(revoked).toEqual(Array.from({ length: decoded.length }, (_, idx) => idx == 5727));
  });

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    // The credential verification should pass as the credential has not been revoked.
    const result = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });

    expect(result.verified).toBe(true);

    // Revoke the credential
    const fetchedCred = await dockAPI.statusListCredential.fetchStatusList2021Credential(
      statusListCredentialId,
    );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredential.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      dockAPI,
    );

    // The credential verification should fail as the credential has been revoked.
    const result1 = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });

    expect(result1.verified).toBe(false);
    expect(result1.error).toBe(
      'Credential was revoked (or suspended) according to the status list referenced in `credentialStatus`',
    );
  }, 50000);

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    // The previous test revokes credential so unsuspend it. Its fine if the previous test is not run as unrevoking does not
    // throw error if the credential is not revoked.
    let fetchedCred = await dockAPI.statusListCredential.fetchStatusList2021Credential(
      statusListCredentialId,
    );
    await fetchedCred.update(issuerKey, {
      unsuspendIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredential.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      dockAPI,
    );
    const holderKey = getKeyDoc(
      holderDID,
      dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );

    // Create presentation for unsuspended credential
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

    // As the credential is unsuspended, the presentation should verify successfully.
    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(result.verified).toBe(true);

    // Revoke credential
    fetchedCred = await dockAPI.statusListCredential.fetchStatusList2021Credential(
      statusListCredentialId,
    );
    await fetchedCred.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    await dockAPI.statusListCredential.updateStatusListCredentialWithOneOfPolicy(
      statusListCredentialId,
      fetchedCred,
      issuerDID,
      issuerKeyPair,
      dockAPI,
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
