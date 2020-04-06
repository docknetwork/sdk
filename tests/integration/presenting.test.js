import {randomAsHex} from '@polkadot/util-crypto';
import {Ed25519KeyPair} from 'jsonld-signatures';
import { hexToU8a } from '@polkadot/util';

import {
  createNewDockDID
} from '../../src/utils/did';

import {DockAPI} from '../../src/api';
import Resolver from '../../src/resolver';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {getKeyDoc, registerNewDIDUsingPair} from './helpers';

const vc = new VerifiableCredentialModule();

// 1st issuer's DID.
const issuer1DID = createNewDockDID();
// seed used for 1st issuer keys
const issuer1KeySeed = randomAsHex(32);

const holder1DID = createNewDockDID();
// seed used for 1st issuer keys
const holder1KeySeed = randomAsHex(32);

const credId = randomAsHex(32);

function getUnsignedCred(credId, holderDID) {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
      // Following URL is for Sr25519 Signature and verification key. This is not a real URL but resolves to a context
      // because of the mapping defined in `contexts.js`
      'https://www.dock.io/2020/credentials/context/sr25519',
    ],
    id: credId,
    type: ['VerifiableCredential', 'AlumniCredential'],
    issuanceDate: '2020-03-18T19:23:24Z',
    credentialSubject: {
      id: holderDID,
      alumniOf: 'Example University'
    }
  };
}

let unsignedCred = getUnsignedCred(credId, holder1DID);

let credEd25519;

describe('Verifiable Presentation where both issuer and holder have a Dock DID', () => {
  const dock = new DockAPI();
  let resolver;

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    // The keyring should be initialized before any test begins as this suite is testing revocation
    const account = dock.keyring.addFromUri(TestAccount.uri, TestAccount.options);
    dock.setAccount(account);

    // The DIDs should be written before any test begins

    // Register issuer DID with ed25519 key
    const pair1 = dock.keyring.addFromUri(issuer1KeySeed, null, 'ed25519');
    await registerNewDIDUsingPair(dock, issuer1DID, pair1);

    // Register holder DID with ed25519 key
    const pair2 = dock.keyring.addFromUri(holder1KeySeed, null, 'ed25519');
    await registerNewDIDUsingPair(dock, holder1DID, pair2);

    // Register holder DID with secp key
    const pair3 = generateEcdsaSecp256k1Keypair(holder2KeyPers, holder2KeyEntropy);
    await registerNewDIDUsingPair(dock, holder2DID, pair3);

    // Register holder DID with sr25519 key
    const pair4 = dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519');
    await registerNewDIDUsingPair(dock, holder3DID, pair4);

    const providers = {
      'dock': FullNodeEndpoint,
    };

    resolver = new Resolver(providers);
    resolver.init();

    const issuerKey = await Ed25519KeyPair.generate({seed: hexToU8a(issuerKeySeed)});
    const issuerKeyDoc = getKeyDoc(issuerDID, issuerKey, 'Ed25519VerificationKey2018');

    // Issuer issues credential with id `credId1` to holder with DID `holder1DID`
    cred1 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId1, holder1DID));

    // Issuer issues credential with id `credId2` to holder with DID `holder2DID`
    cred2 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId2, holder2DID));

    // Issuer issues credential with id `credId3` to holder with DID `holder3DID`
    cred3 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId3, holder3DID));

    // Issuer issues credential with id `credId4` to holder with DID `holder3DID`
    cred4 = await issueCredential(issuerKeyDoc, getUnsignedCred(credId4, holder3DID));

    done();
  }, 70000);

  test('Holder creates a verifiable presentation with single credential and verifier verifies it', async () => {
    // Generate keys for 3 holders where each has a different kind of key.
    const holder1Key = getKeyDoc(holder1DID, await Ed25519KeyPair.generate({seed: hexToU8a(holder1KeySeed)}), 'Ed25519VerificationKey2018');
    const holder2Key = getKeyDoc(holder2DID, await Secp256k1KeyPair.generate({pers: holder2KeyPers, entropy: holder2KeyEntropy}), 'EcdsaSecp256k1VerificationKey2019');
    const holder3Key = getKeyDoc(holder3DID, dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 'Sr25519VerificationKey2020');

    for (const elem of [
      [cred1, 'Ed25519Signature2018', holder1Key],
      [cred2, 'EcdsaSecp256k1Signature2019', holder2Key],
      [cred3, 'Sr25519Signature2020', holder3Key],
    ]) {
      const cred = elem[0];
      const sigType = elem[1];
      const holderKey = elem[2];

      const res = await isVerifiedCredential(cred, resolver);
      expect(res).toBe(true);

      const presId = randomAsHex(32);
      const chal = randomAsHex(32);
      const domain = 'test domain';
      const presentation = createPresentation(
        cred,
        presId
      );

      expect(presentation).toMatchObject(
        expect.objectContaining(
          {
            type: [ 'VerifiablePresentation' ],
            verifiableCredential: [cred],
            id: presId,
          }
        )
      );

      const signedPres = await signPresentation(
        presentation,
        holderKey,
        chal,
        domain,
        resolver
      );

      expect(signedPres).toMatchObject(
        expect.objectContaining(
          {
            type: [ 'VerifiablePresentation' ],
            verifiableCredential: [cred],
            id: presId,
            proof: expect.objectContaining({
              type: sigType,
              challenge: chal,
              domain: domain,
              proofPurpose: 'authentication',
            })
          }
        )
      );

      const result = await verifyPresentation(
        signedPres,
        chal,
        domain,
        resolver
      );

      // Verifier checks that both credential and presentation are correct.
      expect(result.verified).toBe(true);
      expect(result.presentationResult.verified).toBe(true);
      expect(result.credentialResults.length).toBe(1);
      expect(result.credentialResults[0].verified).toBe(true);

    }
  }, 70000);

  test('Holder creates a verifiable presentation with 2 credentials and verifier verifies it', async () => {
    const holder3Key = getKeyDoc(holder3DID, dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 'Sr25519VerificationKey2020');

    const res = await isVerifiedCredential(cred3, resolver);
    expect(res).toBe(true);
    const res1 = await isVerifiedCredential(cred4, resolver);
    expect(res1).toBe(true);

    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';

    const presentation = createPresentation(
      [cred3, cred4],
      presId
    );

    expect(presentation).toMatchObject(
      expect.objectContaining(
        {
          type: [ 'VerifiablePresentation' ],
          verifiableCredential: [credEd25519],
          id: presId,
        }
      )
    );

    const holderKey = getKeyDoc(holder1DID, await Ed25519KeyPair.generate({seed: hexToU8a(holder1KeySeed)}), 'Ed25519VerificationKey2018');

    const signedPres = await vc.signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver
    );

    expect(signedPres).toMatchObject(
      expect.objectContaining(
        {
          type: [ 'VerifiablePresentation' ],
          verifiableCredential: [credEd25519],
          id: presId,
          proof: expect.objectContaining({
            type: 'Ed25519Signature2018',
            challenge: chal,
            domain: domain,
            proofPurpose: 'authentication',
          })
        }
      )
    );

    const result = await vc.verifyPresentation(
      signedPres,
      chal,
      domain,
      resolver
    );

    expect(result.verified).toBe(true);
    expect(result.presentationResult.verified).toBe(true);
    expect(result.credentialResults.length).toBe(1);
    expect(result.credentialResults[0].verified).toBe(true);
  }, 30000);
});
