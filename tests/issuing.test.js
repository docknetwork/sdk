import VerifiableCredential from '../src/modules/vc.js';

describe('Verifiable Credential Issuing', () => {
  let vc = new VerifiableCredential();
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

  test('Issuing should return an object with a proof.', async () => {
    expect(
      vc.issue(sample_key, sample_unsigned_cred)
    ).toEqual(expect.objectContaining(
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
        proof: expect.objectContaining(
          expect.anything()
        )
      }
    )
    );
  });
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
      created: '2020-03-18T20:46:44Z',
      jws: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEYCIQDk3JyM_ygoM39SVg1CKX7p70CJwSRoQTk2c3Pnx7QscgIhAKLUtcsh_Ydae5JfiOqV-XcF4nIKh77WdI_4HAQKh1wX',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
    }
  };

  test('The sample signed credential should pass verification.', async () => {
    expect(
      vc.verify(sample_signed_cred)
    ).toEqual(expect.objectContaining(
      {
        verified: true
      }
      )
    );
  });
});
