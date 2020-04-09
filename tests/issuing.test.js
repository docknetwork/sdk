import {
  issueCredential,
  verifyCredential,
  createPresentation,
  verifyPresentation,
  signPresentation
} from '../src/utils/vc';
import VerifiableCredential from '../src/verifiable-credential';
import VerifiablePresentation from '../src/verifiable-presentation';

//TODO: clean up these fixtures
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
const sample_signed_cred_2 = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1'
  ],
  id: 'https://example.com/credentials/12345',
  type: [ 'VerifiableCredential', 'AlumniCredential' ],
  issuanceDate: '2020-03-18T19:23:24Z',
  credentialSubject: {
    id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
    alumniOf: 'Chalmers University of Technology'
  },
  issuer: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
  proof: {
    type: 'EcdsaSecp256k1Signature2019',
    created: '2020-03-31T22:36:43Z',
    jws: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEQCICMZbCslyGWpLA_zbOmUHzIvGf7RPU0l3SumBSuV5LjpAiB_3gHChW_1AIwf3bdnC_g7HLZSwcCIJxUpoir4FUhfsQ',
    proofPurpose: 'assertionMethod',
    verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
  }
};
const vp_id = 'https://example.com/credentials/12345';
const vp_holder = 'https://example.com/credentials/1234567890';
const presentation_credentials = [sample_signed_cred, sample_signed_cred_2];
const sample_unsigned_pres = {
  '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
  type: [ 'VerifiablePresentation' ],
  verifiableCredential: presentation_credentials,
  id: vp_id,
  holder: vp_holder
};
const sample_presentation_proof = {
  proof: {
    type: 'EcdsaSecp256k1Signature2019',
    created: expect.anything(),
    challenge: 'some_challenge',
    domain: 'some_domain',
    jws: expect.anything(),
    proofPurpose: 'authentication',
    verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
  }
};

describe('Verifiable Credential Issuing', () => {
  test('Issuing should return an object with a proof, and it must pass validation.', async () => {
    const credential = await issueCredential(sample_key, sample_unsigned_cred);
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
    const result = await verifyCredential(credential);
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
  test('The sample signed credential should pass verification.', async () => {
    const result = await verifyCredential(sample_signed_cred);
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

describe('Verifiable Presentation creation', () => {
  test('A proper verifiable presentation should be created from two valid sample credentials.', async () => {
    const presentation = createPresentation(
      presentation_credentials,
      vp_id,
      vp_holder
    );
    expect(presentation).toMatchObject(sample_unsigned_pres);
  }, 30000);

  test('A verifiable presentation should contain a proof once signed, and it should pass verification.', async () => {
    const signed_vp = await signPresentation(
      sample_unsigned_pres,
      sample_key,
      'some_challenge',
      'some_domain',
    );
    expect(signed_vp).toMatchObject(
      {
        ...sample_unsigned_pres,
        ...sample_presentation_proof
      }
    );
    const results = await verifyPresentation(
      signed_vp,
      'some_challenge',
      'some_domain'
    );
    expect(results).toMatchObject(
      {
        presentationResult: {
          verified: true,
          results: [
            {
              proof: {
                '@context': 'https://w3id.org/security/v2',
                type: 'EcdsaSecp256k1Signature2019',
                created: expect.anything(),
                challenge: 'some_challenge',
                domain: 'some_domain',
                jws: expect.anything(),
                proofPurpose: 'authentication',
                verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
              },
              verified: true
            }
          ]
        },
        verified: true,
        credentialResults: [
          { verified: true, results: expect.anything() },
          { verified: true, results: expect.anything() }
        ],
        error: undefined
      }
    );
  }, 30000);
});

describe('Verifiable Credential incremental creation', () => {
  test('VC creation with only id should be possible, yet bring default values', async () => {
    let credential = new VerifiableCredential('blabla');
    expect(credential.id).toBe('blabla');
    expect(credential.context).toEqual(['https://www.w3.org/2018/credentials/v1']);
    expect(credential.type).toEqual(['VerifiableCredential']);
    expect(credential.issuanceDate).toEqual(expect.anything());
  });

  test('JSON representation of a VC should bring the proper keys', async () => {
    let credential = new VerifiableCredential('blabla');
    expect(credential.toJSON()).toEqual(
      {
        '@context':['https://www.w3.org/2018/credentials/v1'],
        'id':'blabla',
        'credentialSubject':[],
        'type':['VerifiableCredential',],
        'issuanceDate':expect.anything(),
      }
    );
  });

  test('Incremental VC creation should be possible', async () => {
    let credential = new VerifiableCredential('blabla');
    expect(credential.id).toBe('blabla');

    credential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    expect(credential.context).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ]);
    credential.addType('some_type');
    expect(credential.type).toEqual([
      'VerifiableCredential',
      'some_type'
    ]);
    credential.addSubject({id: 'some_subject_id'});
    expect(credential.subject).toEqual([{id: 'some_subject_id'}]);
    credential.setStatus({id: 'some_status_id', type: 'CredentialStatusList2017'});
    expect(credential.status).toEqual({id: 'some_status_id', type: 'CredentialStatusList2017'});
    credential.setIssuanceDate('2020-03-18T19:23:24Z');
    expect(credential.issuanceDate).toEqual('2020-03-18T19:23:24Z');
    credential.setExpirationDate('2021-03-18T19:23:24Z');
    expect(credential.expirationDate).toEqual('2021-03-18T19:23:24Z');
  });

  test('Incremental VC creations runs basic validation', async () => {
    expect(() => {
      new VerifiableCredential({key: 'value'});
    }).toThrowError('needs to be a string.');

    let credential = new VerifiableCredential('blabla');
    expect(() => {
      credential.addContext(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      credential.addType(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      credential.addSubject({some: 'value'});
    }).toThrowError('"credentialSubject" must include an id.');

    expect(() => {
      credential.setStatus({some: 'value', type: 'something'});
    }).toThrowError('"credentialStatus" must include an id.');
    expect(() => {
      credential.setStatus({id: 'value', some: 'value'});
    }).toThrowError('"credentialStatus" must include a type.');

    expect(() => {
      credential.setIssuanceDate('2020');
    }).toThrowError('needs to be a valid datetime.');

    expect(() => {
      credential.setExpirationDate('2020');
    }).toThrowError('needs to be a valid datetime.');

    await expect(credential.verify()).rejects.toThrowError('The current VC has no proof.');

  });

  test('Issuing an incrementally-created VC should return an object with a proof, and it must pass validation.', async () => {
    let unsigned_credential = new VerifiableCredential('https://example.com/credentials/1872');
    unsigned_credential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    const signed_credential = await unsigned_credential.sign(sample_key);
    expect(signed_credential).toMatchObject(
      expect.objectContaining({
        proof: expect.anything()
      }
      )
    );
    const result = await signed_credential.verify();
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

describe('Verifiable Presentation incremental creation', () => {
  test('VP creation with only id should be possible, yet bring default values', async () => {
    let vp = new VerifiablePresentation('blabla');
    expect(vp.id).toBe('blabla');
    expect(vp.context).toEqual(['https://www.w3.org/2018/credentials/v1']);
    expect(vp.type).toEqual(['VerifiablePresentation']);
    expect(vp.credentials).toEqual([]);
  });

  test('The JSON representation of a VP should bring the proper keys', async () => {
    let vp = new VerifiablePresentation('blabla');
    expect(vp.toJSON()).toEqual(
      {
        '@context':['https://www.w3.org/2018/credentials/v1'],
        'id':'blabla',
        'verifiableCredential':[],
        'type':['VerifiablePresentation'],
      }
    );
  });

  test('Incremental VP creation should be possible', async () => {
    let vp = new VerifiablePresentation('blabla');
    expect(vp.id).toBe('blabla');

    vp.addContext('https://www.w3.org/2018/credentials/examples/v1');
    expect(vp.context).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ]);
    vp.addType('some_type');
    expect(vp.type).toEqual([
      'VerifiablePresentation',
      'some_type'
    ]);
    vp.addCredential({id: 'some_credential_id'});
    expect(vp.credentials).toEqual([{id: 'some_credential_id'}]);
  });

  test('Incremental VP creations runs basic validation', async () => {
    expect(() => {
      new VerifiablePresentation({key: 'value'});
    }).toThrowError('needs to be a string.');

    let vp = new VerifiablePresentation('blabla');
    expect(() => {
      vp.addContext(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      vp.addType(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      vp.addCredential({some: 'value'});
    }).toThrowError('"credential" must include an id.');

    await expect(vp.verify()).rejects.toThrowError('The current VP has no proof.');

  });

  test('Incremental VP creation from external VCs should be possible', async () => {
    let vp = new VerifiablePresentation(vp_id);
    vp.addCredential(sample_signed_cred);
    expect(vp.credentials).toEqual([sample_signed_cred]);
    await vp.sign(
      sample_key,
      'some_challenge',
      'some_domain',
    );
    expect(vp.proof).toMatchObject({type: 'EcdsaSecp256k1Signature2019'});
    expect(vp.proof).toMatchObject({created: expect.anything()});
    expect(vp.proof).toMatchObject({challenge: 'some_challenge'});
    expect(vp.proof).toMatchObject({domain: 'some_domain'});
    expect(vp.proof).toMatchObject({jws: expect.anything()});
    expect(vp.proof).toMatchObject({proofPurpose: 'authentication'});
    expect(vp.proof).toMatchObject({verificationMethod: expect.anything()});

    const results = await vp.verify(
      'some_challenge',
      'some_domain'
    );
    expect(results.presentationResult).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({proof: expect.anything()});
    expect(results.credentialResults[0]).toMatchObject({verified: true});
    expect(results.credentialResults[0]).toMatchObject({results: expect.anything()});
  });


  test('Issuing an incrementally-created VP from an incrementally created VC should return an object with a proof, and it must pass validation.', async () => {
    let vc = new VerifiableCredential('https://example.com/credentials/1872');
    vc.addContext('https://www.w3.org/2018/credentials/examples/v1');
    vc.addType('AlumniCredential');
    vc.addSubject({
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University'
    });
    await vc.sign(sample_key);
    const vc_verification_result = await vc.verify();
    expect(vc_verification_result).toMatchObject({'verified': true});

    let vp = new VerifiablePresentation(vp_id);
    vp.setHolder(vp_holder);
    vp.addCredential(vc);
    await vp.sign(
      sample_key,
      'some_challenge',
      'some_domain',
    );
    expect(vp.proof).toMatchObject({type: 'EcdsaSecp256k1Signature2019'});
    expect(vp.proof).toMatchObject({created: expect.anything()});
    expect(vp.proof).toMatchObject({challenge: 'some_challenge'});
    expect(vp.proof).toMatchObject({domain: 'some_domain'});
    expect(vp.proof).toMatchObject({jws: expect.anything()});
    expect(vp.proof).toMatchObject({proofPurpose: 'authentication'});
    expect(vp.proof).toMatchObject({verificationMethod: expect.anything()});

    const results = await vp.verify(
      'some_challenge',
      'some_domain'
    );
    expect(results.presentationResult).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({proof: expect.anything()});
    expect(results.credentialResults[0]).toMatchObject({verified: true});
    expect(results.credentialResults[0]).toMatchObject({results: expect.anything()});
  }, 30000);

});
