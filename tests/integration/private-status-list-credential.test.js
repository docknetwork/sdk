import { randomAsHex } from '@polkadot/util-crypto';
import { DockAPI } from '../../src';
import { DockResolver } from '../../src/resolver';
import { createNewDockDID } from '../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { getUnsignedCred, registerNewDIDUsingPair } from './helpers';
import {
  issueCredential, signPresentation, verifyCredential, verifyPresentation,
} from '../../src/utils/vc';
import defaultDocumentLoader from '../../src/utils/vc/document-loader';
import PrivateStatusList2021Credential from '../../src/status-list-credential/private-status-list2021-credential';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import {
  addPrivateStatusListEntryToCredential,
  getPrivateStatus,
  verifyPrivateStatus,
} from '../../src/utils/vc/credentials';
import { createPresentation } from '../create-presentation';
import { getPrivateStatuses } from '../../src/utils/vc/presentations';

const termsOfUseCtx = {
  '@context': {
    details: {
      '@id': 'https://ld.dock.io/security#details',
      '@context': {
        id: '@id',
        price: 'https://schema.org/price',
        currency: 'https://schema.org/priceCurrency',
      },
    },
  },
};

describe('PrivateStatusList2021Credential', () => {
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

  const credId = 'test_cred';

  let issuerKey;
  let issuerKeyPair;
  let privateStatusListCredential;
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
    issuerKeyPair = dockAPI.keyring.addFromUri(issuerSeed, null, 'ed25519');
    await registerNewDIDUsingPair(dockAPI, issuerDID, issuerKeyPair);

    // Register holder DID
    const pair1 = dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519');
    await registerNewDIDUsingPair(dockAPI, holderDID, pair1);

    issuerKey = getKeyDoc(
      issuerDID,
      issuerKeyPair,
      'Ed25519VerificationKey2018',
    );

    privateStatusListCredential = await PrivateStatusList2021Credential.create(
      issuerKey,
      statusListCredentialId,
      { statusPurpose: 'suspension' },
    );
  }, 60000);

  test('Issuer can issue a revocable credential and holder can verify it successfully when it is not revoked else the verification fails', async () => {
    let unsignedCred = getUnsignedCred(credId, holderDID, [
      'https://ld.dock.io/private-status-list-21',
      termsOfUseCtx,
    ]);

    // Adding payment terms to the credential. This isn't mandatory as it could be communicated out of band.
    unsignedCred.termsOfUse = [{
      type: 'Payment',
      details: {
        price: 10, currency: 'USD',
      },
    }];

    expect(() => addPrivateStatusListEntryToCredential(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex,
      'wrongPurpose',
    )).toThrow();

    // Issuer issues the credential with a given status list id for revocation
    unsignedCred = addPrivateStatusListEntryToCredential(
      unsignedCred,
      statusListCredentialId,
      statusListCredentialIndex,
      'suspension',
    );

    credential = await issueCredential(
      issuerKey,
      unsignedCred,
      undefined,
      defaultDocumentLoader(resolver),
    );

    // The credential is verifiable successfully
    const { verified } = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });
    expect(verified).toEqual(true);

    // Holder gets the status info from the credential
    const status = getPrivateStatus(credential);

    // The status is given to a party capable of checking revocation. Revocation check passes.
    const { verified: v } = await verifyPrivateStatus(status, privateStatusListCredential, { documentLoader: defaultDocumentLoader(resolver), expectedIssuer: credential.issuer });
    expect(v).toEqual(true);

    // Revoke credential
    await privateStatusListCredential.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    // // The credential can still be verified after revoking
    const { verified: v1 } = await verifyCredential(credential, {
      resolver,
      compactProof: true,
    });
    expect(v1).toEqual(true);

    // The revocation check fails now
    const { verified: v2 } = await verifyPrivateStatus(status, privateStatusListCredential, { documentLoader: defaultDocumentLoader(resolver), expectedIssuer: credential.issuer });
    expect(v2).toEqual(false);
  });

  test('Holder can create a presentation and verifier can verify it successfully when it is not revoked else the verification fails', async () => {
    await privateStatusListCredential.update(issuerKey, {
      unsuspendIndices: [statusListCredentialIndex],
    });

    const holderKey = getKeyDoc(
      holderDID,
      dockAPI.keyring.addFromUri(holderSeed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );

    // Create presentation for unsuspended credential
    const presId = randomAsHex(32);
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

    const { verified } = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(verified).toBe(true);

    // Get statuses from presentation
    const statuses = getPrivateStatuses(signedPres);

    // The status will be verified by the parties in charge of revocation and these can be distinct
    const { verified: v } = await verifyPrivateStatus(statuses[0], privateStatusListCredential, { documentLoader: defaultDocumentLoader(resolver), expectedIssuer: credential.issuer });
    expect(v).toEqual(true);

    // Revoke credential
    await privateStatusListCredential.update(issuerKey, {
      revokeIndices: [statusListCredentialIndex],
    });

    // Presentation can still be verified
    const { verified: v1 } = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      compactProof: true,
    });
    expect(v1).toBe(true);

    // Status check fails now.
    const { verified: v2 } = await verifyPrivateStatus(statuses[0], privateStatusListCredential, { documentLoader: defaultDocumentLoader(resolver), expectedIssuer: credential.issuer });
    expect(v2).toEqual(false);
  });

  afterAll(async () => {
    await dockAPI.disconnect();
  }, 10000);
});
