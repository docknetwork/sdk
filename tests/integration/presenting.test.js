import {randomAsHex} from '@polkadot/util-crypto';
import {Ed25519KeyPair} from 'jsonld-signatures';
import { hexToU8a } from '@polkadot/util';

import {
  createNewDockDID
} from '../../src/utils/did';

import VerifiableCredentialModule from '../../src/modules/vc';
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

    const providers = {
      'dock': FullNodeEndpoint,
    };

    resolver = new Resolver(providers);
    resolver.init();

    const issuerKeyPair = await Ed25519KeyPair.generate({seed: hexToU8a(issuer1KeySeed)});
    credEd25519 = await vc.issueCredential(
      getKeyDoc(issuer1DID, issuerKeyPair, 'Ed25519VerificationKey2018'),
      unsignedCred, false);

    done();
  }, 40000);

  test('Holder creates a verifiable presentation with ed25519 key and verifier verifies it', async () => {
    const presId = randomAsHex(32);
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = vc.createPresentation(
      credEd25519,
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
