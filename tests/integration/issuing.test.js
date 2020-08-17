import { randomAsHex } from '@polkadot/util-crypto';

import {
  createNewDockDID,
} from '../../src/utils/did';

import { DockAPI } from '../../src/api';
import { DockResolver } from '../../src/resolver';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getUnsignedCred, registerNewDIDUsingPair } from './helpers';
import { generateEcdsaSecp256k1Keypair } from '../../src/utils/misc';
import { issueCredential, verifyCredential } from '../../src/utils/vc';
import getKeyDoc from '../../src/utils/vc/helpers';

// 1st issuer's DID.
const issuer1DID = createNewDockDID();
// seed used for 1st issuer keys
const issuer1KeySeed = randomAsHex(32);

// 2nd issuer's DID.
const issuer2DID = createNewDockDID();
// entropy used for 2nd issuer keys
const issuer2KeyPers = 'issuer2';
const issuer2KeyEntropy = randomAsHex(32);

const issuer3DID = createNewDockDID();
// seed used for 3rd issuer keys
const issuer3KeySeed = randomAsHex(32);

const holderDID = createNewDockDID();

const credId = randomAsHex(32);

const unsignedCred = getUnsignedCred(credId, holderDID);

/**
 * Test helper to get the matching doc as per the cred
 * @param cred - credential to match
 * @param issuer
 * @param issuerKeyId
 * @param sigType
 * @returns {{issuanceDate: string, credentialSubject: {alumniOf: string, id: *}, id: *, proof: *, type: [string, string], issuer: string}}
 */
function getCredMatcherDoc(cred, issuer, issuerKeyId, sigType) {
  return {
    id: cred.id,
    type: cred.type,
    issuanceDate: cred.issuanceDate,
    credentialSubject: cred.credentialSubject,
    issuer,
    proof: expect.objectContaining({
      type: sigType,
      jws: expect.anything(),
      proofPurpose: 'assertionMethod',
      verificationMethod: issuerKeyId,
    }),
  };
}

function getProofMatcherDoc() {
  return {
    results: [
      {
        proof: expect.anything(),
        purposeResult: expect.anything(),
        verified: true,
      },
    ],
    verified: true,
  };
}

describe('Verifiable Credential issuance where issuer has a Dock DID', () => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // The DIDs should be written before any test begins

    // DID with ed25519 key
    const pair1 = dock.keyring.addFromUri(issuer1KeySeed, null, 'ed25519');
    await registerNewDIDUsingPair(dock, issuer1DID, pair1);

    // DID with secp key
    const pair2 = generateEcdsaSecp256k1Keypair(issuer2KeyPers, issuer2KeyEntropy);
    await registerNewDIDUsingPair(dock, issuer2DID, pair2);

    // DID with sr25519 key
    const pair3 = dock.keyring.addFromUri(issuer3KeySeed, null, 'sr25519');
    await registerNewDIDUsingPair(dock, issuer3DID, pair3);

    done();
  }, 60000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);


  test('Issue a verifiable credential with ed25519 key and verify it', async () => {
    const issuerKey = getKeyDoc(issuer1DID, dock.keyring.addFromUri(issuer1KeySeed, null, 'ed25519'), 'Ed25519VerificationKey2018');
    const credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, issuer1DID, issuerKey.id, 'Ed25519Signature2018'),
      ),
    );

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(
        getProofMatcherDoc(),
      ),
    );
  }, 40000);

  test('Issue a verifiable credential with secp256k1 key and verify it', async () => {
    const issuerKey = getKeyDoc(issuer2DID, generateEcdsaSecp256k1Keypair(issuer2KeyPers, issuer2KeyEntropy), 'EcdsaSecp256k1VerificationKey2019');
    const credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, issuer2DID, issuerKey.id, 'EcdsaSecp256k1Signature2019'),
      ),
    );
    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(
        getProofMatcherDoc(),
      ),
    );
  }, 40000);

  test('Issue a verifiable credential with sr25519 key and verify it', async () => {
    const issuerKey = getKeyDoc(issuer3DID, dock.keyring.addFromUri(issuer3KeySeed, null, 'sr25519'), 'Sr25519VerificationKey2020');
    const credential = await issueCredential(issuerKey, unsignedCred, true);

    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, issuer3DID, issuerKey.id, 'Sr25519Signature2020'),
      ),
    );

    const result = await verifyCredential(credential, { resolver });

    expect(result).toMatchObject(
      expect.objectContaining(
        getProofMatcherDoc(),
      ),
    );
  }, 40000);
});
