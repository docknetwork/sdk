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

const vc = new VerifiableCredentialModule();

const issuerDID = createNewDockDID();
// seed used for issuer keys
const issuerKeySeed = randomAsHex(32);

const holderDID = createNewDockDID();

const credId = randomAsHex(32);

describe('Verifiable Credential issuance where issuer has a Dock DID with ed25519 key', () => {
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

    // The DID should be written before any test begins
    const pair = dock.keyring.addFromUri(issuerKeySeed, null, 'ed25519');
    await registerNewDID(dock, issuerDID, issuerKeySeed, pair);

    const providers = {
      'dock': FullNodeEndpoint,
    };

    resolver = new Resolver(providers);
    resolver.init();

    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

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


  test('Issue a verifiable credential and verify it', async () => {
    const seedAsBytes = hexToU8a(issuerKeySeed);
    const issuerKeyPair = await Ed25519KeyPair.generate({seed: seedAsBytes});
    const issuerKey = {
      id: `${issuerDID}#keys-1`,
      controller: issuerDID,
      type: 'Ed25519VerificationKey2018',
      privateKeyBase58: issuerKeyPair.privateKey,
      publicKeyBase58: issuerKeyPair.publicKey
    };
    const credential = await vc.issue(issuerKey, unsignedCred, resolver);
    expect(credential).toMatchObject(
      expect.objectContaining(
        {
          id: credId,
          type: [
            'VerifiableCredential',
            'AlumniCredential'
          ],
          issuanceDate: '2020-03-18T19:23:24Z',
          credentialSubject: {
            id: holderDID,
            alumniOf: 'Example University'
          },
          issuer: issuerDID,
          proof: expect.objectContaining({
            type: 'Ed25519Signature2018',
            jws: expect.anything(),
            proofPurpose: 'assertionMethod',
            verificationMethod: issuerKey.id
          })
        }
      )
    );

    const result = await vc.verify(credential, resolver);
    expect(result).toMatchObject(
      expect.objectContaining(
        {
          'results': [
            {
              'proof': expect.anything(),
              'verified': true
            }
          ],
          'verified': true
        }
      )
    );
  }, 35000);
});
