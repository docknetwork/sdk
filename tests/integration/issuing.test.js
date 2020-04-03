import {randomAsHex} from '@polkadot/util-crypto';
import {Ed25519KeyPair} from 'jsonld-signatures';
import { hexToU8a } from '@polkadot/util';

import {
  createNewDockDID
} from '../../src/utils/did';

import VerifiableCredentialModule from '../../src/modules/vc';
import {DockAPI} from '../../src/api';
import {Resolver} from '../../src/resolver';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import {registerNewDID} from './helpers';
import {generateEcdsaSecp256k1Keypair} from '../../src/utils/misc';
import {Secp256k1KeyPair} from '../../src/utils/vc/temp-signatures';

const vc = new VerifiableCredentialModule();

// 1st issuer's DID.
const issuer1DID = createNewDockDID();
// seed used for 1st issuer keys
const issuer1KeySeed = randomAsHex(32);

// 2nd issuer's DID.
const issuer2DID = createNewDockDID();
// seed used for 2nd issuer keys
const issuer2KeyPers = 'issuer2';
const issuer2KeyEntropy = randomAsHex(32);

const holderDID = createNewDockDID();

const credId = randomAsHex(32);

const unsignedCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1'
  ],
  id: credId,
  type: ['VerifiableCredential', 'AlumniCredential'],
  issuanceDate: '2020-03-18T19:23:24Z',
  credentialSubject: {
    id: holderDID,
    alumniOf: 'Example University'
  }
};

/**
 * Test helper to get the issuer key doc
 * @param did
 * @param keypair
 * @param typ
 * @returns {{publicKeyBase58: *, controller: *, id: string, type: *, privateKeyBase58: (string|KeyObject|T2|Buffer|CryptoKey)}}
 */
function getIssuerKeyDoc(did, keypair, typ) {
  return {
    id: `${did}#keys-1`,
    controller: did,
    type: typ,
    privateKeyBase58: keypair.privateKey,
    publicKeyBase58: keypair.publicKey
  };
}

/**
 * Test helper to get the matching doc as per the cred
 * @param cred - credential to match
 * @param issuerKeyId
 * @param sigType
 * @returns {{issuanceDate: string, credentialSubject: {alumniOf: string, id: *}, id: *, proof: AsymmetricMatcher, type: [string, string], issuer: string}}
 */
function getCredMatcherDoc(cred, issuer, issuerKeyId, sigType) {
  return {
    id: cred.id,
    type: cred.type,
    issuanceDate: cred.issuanceDate,
    credentialSubject: cred.credentialSubject,
    issuer: issuer,
    proof: expect.objectContaining({
      type: sigType,
      jws: expect.anything(),
      proofPurpose: 'assertionMethod',
      verificationMethod: issuerKeyId
    })
  };
}

function getProofMatcherDoc() {
  return {
    'results': [
      {
        'proof': expect.anything(),
        'verified': true
      }
    ],
    'verified': true
  };
}

describe('Verifiable Credential issuance where issuer has a Dock DID', () => {
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

    // DID with ed25519 key
    const pair1 = dock.keyring.addFromUri(issuer1KeySeed, null, 'ed25519');
    await registerNewDID(dock, issuer1DID, pair1);

    // DID with secp key
    const pair2 = generateEcdsaSecp256k1Keypair(issuer2KeyPers, issuer2KeyEntropy);
    await registerNewDID(dock, issuer2DID, pair2);

    const providers = {
      'dock': FullNodeEndpoint,
    };

    resolver = new Resolver(providers);
    resolver.init();

    done();
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);


  test('Issue a verifiable credential with ed25519 key and verify it', async () => {
    const issuerKeyPair = await Ed25519KeyPair.generate({seed: hexToU8a(issuer1KeySeed)});
    const issuerKey = getIssuerKeyDoc(issuer1DID, issuerKeyPair, 'Ed25519VerificationKey2018');
    const credential = await vc.issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, issuer1DID, issuerKey.id, 'Ed25519Signature2018')
      )
    );

    const result = await vc.verifyCredential(credential, resolver);
    expect(result).toMatchObject(
      expect.objectContaining(
        getProofMatcherDoc()
      )
    );
  }, 35000);

  test('Issue a verifiable credential with secp256k1 key and verify it', async () => {
    const issuerKeyPair = await Secp256k1KeyPair.generate({pers: issuer2KeyPers, entropy: issuer2KeyEntropy});
    const issuerKey = getIssuerKeyDoc(issuer2DID, issuerKeyPair, 'EcdsaSecp256k1VerificationKey2019');
    const credential = await vc.issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, issuer2DID, issuerKey.id, 'EcdsaSecp256k1Signature2019')
      )
    );
    const result = await vc.verifyCredential(credential, resolver);
    expect(result).toMatchObject(
      expect.objectContaining(
        getProofMatcherDoc()
      )
    );
  }, 35000);
});
