import { randomAsHex } from '@polkadot/util-crypto';

import {
  createNewDockDID,
} from '../../src/utils/did';

import { DockAPI } from '../../src/api';
import { DockResolver } from '../../src/resolver';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getUnsignedCred, registerNewDIDUsingPair } from './helpers';
import { generateEcdsaSecp256k1Keypair } from '../../src/utils/misc';
import getKeyDoc from '../../src/utils/vc/helpers';
import {
  createPresentation,
  issueCredential,
  isVerifiedCredential,
  signPresentation,
  verifyPresentation,
} from '../../src/utils/vc';

// Issuer's DID.
const issuerDID = createNewDockDID();
// seed used for issuer keys
const issuerKeySeed = randomAsHex(32);

const holder1DID = createNewDockDID();
// seed used for 1st holder keys
const holder1KeySeed = randomAsHex(32);

const holder2DID = createNewDockDID();
// entropy used for 2nd holder keys
const holder2KeyPers = 'holder2';
const holder2KeyEntropy = randomAsHex(32);

const holder3DID = createNewDockDID();
// seed used for 3rd holder keys
const holder3KeySeed = randomAsHex(32);

const credId1 = randomAsHex(32);
const credId2 = randomAsHex(32);
const credId3 = randomAsHex(32);
const credId4 = randomAsHex(32);

let cred1;
let cred2;
let cred3;
let cred4;

describe('Verifiable Presentation where both issuer and holder have a Dock DID', () => {
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

    // Register issuer DID with ed25519 key
    const pair1 = dock.keyring.addFromUri(issuerKeySeed, null, 'ed25519');
    await registerNewDIDUsingPair(dock, issuerDID, pair1);

    // Register holder DID with ed25519 key
    const pair2 = dock.keyring.addFromUri(holder1KeySeed, null, 'ed25519');
    await registerNewDIDUsingPair(dock, holder1DID, pair2);

    // Register holder DID with secp key
    const pair3 = generateEcdsaSecp256k1Keypair(holder2KeyPers, holder2KeyEntropy);
    await registerNewDIDUsingPair(dock, holder2DID, pair3);

    // Register holder DID with sr25519 key
    const pair4 = dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519');
    await registerNewDIDUsingPair(dock, holder3DID, pair4);

    const issuerKeyDoc = getKeyDoc(issuerDID, dock.keyring.addFromUri(issuerKeySeed, null, 'ed25519'), 'Ed25519VerificationKey2018');

    // Issuer issues credential with id `credId1` to holder with DID `holder1DID`
    cred1 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId1, holder1DID));

    // Issuer issues credential with id `credId2` to holder with DID `holder2DID`
    cred2 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId2, holder2DID));

    // Issuer issues credential with id `credId3` to holder with DID `holder3DID`
    cred3 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId3, holder3DID));

    // Issuer issues credential with id `credId4` to holder with DID `holder3DID`
    cred4 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId4, holder3DID));

    done();
  }, 90000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Holder creates a verifiable presentation with single credential and verifier verifies it', async () => {
    const holder1Key = getKeyDoc(holder1DID, dock.keyring.addFromUri(holder1KeySeed, null, 'ed25519'), 'Ed25519VerificationKey2018');
    const holder2Key = getKeyDoc(holder2DID, generateEcdsaSecp256k1Keypair(holder2KeyPers, holder2KeyEntropy), 'EcdsaSecp256k1VerificationKey2019');
    const holder3Key = getKeyDoc(holder3DID, dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 'Sr25519VerificationKey2020');

    for (const elem of [
      [cred1, 'Ed25519Signature2018', holder1Key],
      [cred2, 'EcdsaSecp256k1Signature2019', holder2Key],
      [cred3, 'Sr25519Signature2020', holder3Key],
    ]) {
      const cred = elem[0];
      const sigType = elem[1];
      const holderKey = elem[2];

      const res = await isVerifiedCredential(cred, {
        resolver,
      });
      expect(res).toBe(true);

      const presId = randomAsHex(32);
      const chal = randomAsHex(32);
      const domain = 'test domain';
      const presentation = createPresentation(
        cred,
        presId,
      );

      expect(presentation).toMatchObject(
        expect.objectContaining(
          {
            type: ['VerifiablePresentation'],
            verifiableCredential: [cred],
            id: presId,
          },
        ),
      );

      const signedPres = await signPresentation(
        presentation,
        holderKey,
        chal,
        domain,
        resolver,
      );

      expect(signedPres).toMatchObject(
        expect.objectContaining(
          {
            type: ['VerifiablePresentation'],
            verifiableCredential: [cred],
            id: presId,
            proof: expect.objectContaining({
              type: sigType,
              challenge: chal,
              domain,
              proofPurpose: 'authentication',
            }),
          },
        ),
      );

      const result = await verifyPresentation(signedPres, {
        challenge: chal,
        domain,
        resolver,
      });

      expect(result.verified).toBe(true);
      expect(result.presentationResult.verified).toBe(true);
      expect(result.credentialResults.length).toBe(1);
      expect(result.credentialResults[0].verified).toBe(true);
    }
  }, 70000);

  test('Holder creates a verifiable presentation with 2 credentials and verifier verifies it', async () => {
    const holder3Key = getKeyDoc(holder3DID, dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 'Sr25519VerificationKey2020');

    const res = await isVerifiedCredential(cred3, {
      resolver,
      compactProof: true,
      forceRevocationCheck: false,
    });
    expect(res).toBe(true);

    const res1 = await isVerifiedCredential(cred4, {
      resolver,
      compactProof: true,
      forceRevocationCheck: false,
    });
    expect(res1).toBe(true);

    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';

    const presentation = createPresentation(
      [cred3, cred4],
      presId,
    );

    expect(presentation).toMatchObject(
      expect.objectContaining(
        {
          type: ['VerifiablePresentation'],
          verifiableCredential: [cred3, cred4],
          id: presId,
        },
      ),
    );

    const signedPres = await signPresentation(
      presentation,
      holder3Key,
      chal,
      domain,
      resolver,
    );

    expect(signedPres).toMatchObject(
      expect.objectContaining(
        {
          type: ['VerifiablePresentation'],
          verifiableCredential: [cred3, cred4],
          id: presId,
          proof: expect.objectContaining({
            type: 'Sr25519Signature2020',
            challenge: chal,
            domain,
            proofPurpose: 'authentication',
          }),
        },
      ),
    );

    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
    });

    // Verifier checks that both credential and presentation are correct.
    expect(result.verified).toBe(true);
    expect(result.presentationResult.verified).toBe(true);
    expect(result.credentialResults.length).toBe(2);
    expect(result.credentialResults[0].verified).toBe(true);
    expect(result.credentialResults[1].verified).toBe(true);
  }, 60000);
});
