// Mock fetch
import { randomAsHex } from '@polkadot/util-crypto';
import jsonld from 'jsonld';
import mockFetch from '../mocks/fetch';

import { DockDid, DidKeypair } from '../../src/utils/did';

import { DockAPI } from '../../src/index';
import { DockResolver } from '../../src/resolver';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../test-constants';
import {
  getCredMatcherDoc,
  getProofMatcherDoc,
  registerNewDIDUsingPair,
} from './helpers';
import {
  issueCredential,
  signPresentation,
  verifyCredential,
  verifyPresentation,
} from '../../src/utils/vc/index';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import { createPresentation } from '../create-presentation';

mockFetch();

// DID and seed for
const issuerDID = DockDid.random();
const issuerKeySeed = randomAsHex(32);

// DID and seed for 1st subject
const subject1DID = DockDid.random();
const subject1Seed = randomAsHex(32);

// DID for 2nd subject. It has no keys and controlled by subject1DID
const subject2DID = DockDid.random();

const credId = randomAsHex(32);
let credential;

const unsignedCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
  ],
  id: credId,
  type: ['VerifiableCredential', 'DocumentAccessCredential'],
  issuanceDate: '2020-03-18T19:23:24Z',
  credentialSubject: [
    {
      id: String(subject1DID), // DID of the user who is given read access to the document
      type: 'reader',
    },
    {
      id: String(subject2DID), // DID of the document
      type: 'document',
    },
  ],
};

// This test is for a use-case where a user can create documents and expression access control of those documents using credentials.
// The documents are stored at a provider which verifies the aforementioned credentials before giving access to recipients.
// Each user, whether document creator/owner or just a document reader, has a DID. And each created document has a DID whose controller is the document creator.
// The document creator, when giving access issues a credential to the recipient and the credential contains both the recipient's and the document's DID.
// When requesting access to the document, recipient creates a presentation with the credential and verifier checks whether the
// presenter is indeed the recipient of the credential and the requested document DID is present in the credential
describe('Verifiable Credential issuance and presentation where the credential has 2 subjects and of the subject acts as the holder of the presentation', () => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // The DIDs should be written before any test begins

    // issuer DID
    const pair1 = new DidKeypair(
      dock.keyring.addFromUri(issuerKeySeed, null, 'ed25519'),
      1,
    );
    await registerNewDIDUsingPair(dock, issuerDID, pair1);

    // 1st subject's DID
    const pair2 = new DidKeypair(
      dock.keyring.addFromUri(subject1Seed, null, 'ed25519'),
      1,
    );
    await registerNewDIDUsingPair(dock, subject1DID, pair2);

    // 2nd subject's DID, has no key but is controlled by subject1DID
    await dock.did.new(subject2DID, [], [subject1DID], false);
  }, 60000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Issue a verifiable credential with 2 subjects and verify it', async () => {
    const issuerKey = getKeyDoc(
      issuerDID,
      dock.keyring.addFromUri(issuerKeySeed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );
    credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(
          unsignedCred,
          issuerDID,
          issuerKey.id,
          'Ed25519Signature2018',
        ),
      ),
    );

    expect(credential.credentialSubject).toMatchObject([
      {
        id: String(subject1DID),
        type: 'reader',
      },
      {
        id: String(subject2DID),
        type: 'document',
      },
    ]);

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(expect.objectContaining(getProofMatcherDoc()));
  }, 40000);

  test('Holder creates a verifiable presentation and verifier verifies it and does some other checks', async () => {
    const holderKey = getKeyDoc(
      subject1DID,
      dock.keyring.addFromUri(subject1Seed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );

    const presId = `https://pres.com/${randomAsHex(32)}`;
    const challenge = randomAsHex(32);
    const domain = 'test domain';

    const presentation = createPresentation(credential, presId, subject1DID);

    expect(presentation).toMatchObject(
      expect.objectContaining({
        type: ['VerifiablePresentation'],
        verifiableCredential: [credential],
        id: presId,
      }),
    );

    const signedPres = await signPresentation(
      presentation,
      holderKey,
      challenge,
      domain,
      resolver,
    );

    expect(signedPres).toMatchObject(
      expect.objectContaining({
        type: ['VerifiablePresentation'],
        verifiableCredential: [credential],
        id: presId,
        proof: expect.objectContaining({
          type: 'Ed25519Signature2018',
          challenge,
          domain,
          proofPurpose: 'authentication',
        }),
      }),
    );

    // Before verifying the presentation, check that the holder is a specific subject of the credential and the
    // holder did sign it

    // Get the recipient DID and document DID from the presentation
    const credentials = jsonld.getValues(signedPres, 'verifiableCredential');
    const credSubject = jsonld.getValues(credentials[0], 'credentialSubject');
    const recipientDid = jsonld.getValues(credSubject[0], 'id')[0];
    expect(jsonld.getValues(credSubject[0], 'type')[0]).toEqual('reader');
    const documentDid = jsonld.getValues(credSubject[1], 'id')[0];
    expect(jsonld.getValues(credSubject[1], 'type')[0]).toEqual('document');
    expect(recipientDid).toEqual(String(subject1DID));
    expect(documentDid).toEqual(String(subject2DID));

    // Check that presentation signer is the recipient of the credential
    const proofs = jsonld.getValues(signedPres, 'proof');
    const verificationMethod = jsonld.getValues(
      proofs[0],
      'verificationMethod',
    );
    const didOfPresSigner = verificationMethod[0].split('#')[0];
    expect(didOfPresSigner).toEqual(recipientDid);

    // This check isn't mandatory or sufficient as the signer can put whatever it wants as the "holder"
    const presHolder = jsonld.getValues(signedPres, 'holder');
    expect(presHolder).toEqual([recipientDid]);

    const result = await verifyPresentation(signedPres, {
      challenge,
      domain,
      resolver,
    });

    expect(result.verified).toBe(true);
    expect(result.presentationResult.verified).toBe(true);
    expect(result.credentialResults.length).toBe(1);
    expect(result.credentialResults[0].verified).toBe(true);
  }, 40000);
});
