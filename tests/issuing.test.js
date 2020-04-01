import VerifiableCredentialModule from '../src/modules/vc';

const vc = new VerifiableCredentialModule();

describe('Verifiable Credential Issuing', () => {
  const sample_unsigned_cred = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: 'https://example.com/credentials/1872',
    type: ['VerifiableCredential', 'AlumniCredential'],
    issuanceDate: '2020-03-18T19:23:24Z',
    credentialSubject: {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University'
    }
  };
  const sample_key = {
    id: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw',
    controller: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
    type: 'EcdsaSecp256k1VerificationKey2019',
    privateKeyBase58: 'D1HHZntuEUXuQm56VeHv1Ae1c4Rd1mdVeamm2BPKom3y',
    publicKeyBase58: 'zXwDsGkuq5gTLVMnb3jGUaW8vvzAjfZfNuJmP2PkZGJy'
  };

  test('Issuing should return an object with a proof, and it must pass validation.', async () => {
    const credential = await vc.issue(sample_key, sample_unsigned_cred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        {
          id: 'https://example.com/credentials/1872',
          type: [
            'VerifiableCredential',
            'AlumniCredential'
          ],
          issuanceDate: '2020-03-18T19:23:24Z',
          credentialSubject: {
            id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
            alumniOf: 'Example University'
          },
          issuer: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
          proof: expect.objectContaining({
            type: 'EcdsaSecp256k1Signature2019',
            created: expect.anything(),
            jws: expect.anything(),
            proofPurpose: 'assertionMethod',
            verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
          })
        }
      )
    );
    const result = await vc.verify(credential);
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
  }, 30000);
});

describe('Verifiable Credential Verification', () => {
  const sample_signed_cred = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: 'https://example.com/credentials/1872',
    type: [
      'VerifiableCredential',
      'AlumniCredential'
    ],
    issuanceDate: '2010-01-01T19:23:24Z',
    credentialSubject: {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University'
    },
    issuer: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
    proof: {
      type: 'EcdsaSecp256k1Signature2019',
      created: '2020-03-27T17:44:28Z',
      jws: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEQCIAS8ZNVYIni3oShb0TFz4SMAybJcz3HkQPaTdz9OSszoAiA01w9ZkS4Zx5HEZk45QzxbqOr8eRlgMdhgFsFs1FnyMQ',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
    }
  };

  test('The sample signed credential should pass verification.', async () => {
    const result = await vc.verify(sample_signed_cred);
    expect(result).toMatchObject(
      expect.objectContaining(
        {
          'results': [
            {
              'proof': {
                '@context': 'https://w3id.org/security/v2',
                'created': '2020-03-27T17:44:28Z',
                'jws': expect.anything(),
                'proofPurpose': 'assertionMethod',
                'type': 'EcdsaSecp256k1Signature2019',
                'verificationMethod': 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
              },
              'verified': true
            }
          ],
          'verified': true
        }
      )
    );
  }, 30000);
});
