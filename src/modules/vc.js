'use strict';
const documentLoader = require('./vc-helpers/document-loader');

const vc = require('vc-js');
const {Ed25519KeyPair, suites: {Ed25519Signature2018}} =
  require('jsonld-signatures');
const EcdsaSepc256k1Signature2019 = require('ecdsa-secp256k1-signature-2019');
const Secp256k1KeyPair = require('secp256k1-key-pair');

exports.issue = async (keyDoc, credential) => {
  let result;
  try {

    const {controller: issuer, type} = keyDoc;

    let suite;
    switch(type) {
    case 'EcdsaSecp256k1VerificationKey2019':
      suite = new EcdsaSepc256k1Signature2019(
        {key: new Secp256k1KeyPair(keyDoc)});
      break;
    case 'Ed25519VerificationKey2018':
      suite = new Ed25519Signature2018({key: new Ed25519KeyPair(keyDoc)});
      break;
    default:
      throw new Error(`Unknown key type ${type}.`);
    }

    credential.issuer = issuer;
    result = await vc.issue({
      credential,
      suite,
      documentLoader,
    });
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
};

exports.verify = async credential => {
  try {
    const result = await vc.verify({
      credential,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      documentLoader,
    });
    if(result.verified === false) {
      // result can include raw Error
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch(e) {
    console.log(JSON.stringify({verified: false, error: e}, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({verified: true}, null, 2));
  process.exit(0);
};

const sample_cred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1'
  ],
  id: 'https://example.com/credentials/1872',
  type: ['VerifiableCredential', 'AlumniCredential'],
  issuanceDate: '2010-01-01T19:23:24Z',
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
    created: '2020-03-18T20:46:44Z',
    jws: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEYCIQDk3JyM_ygoM39SVg1CKX7p70CJwSRoQTk2c3Pnx7QscgIhAKLUtcsh_Ydae5JfiOqV-XcF4nIKh77WdI_4HAQKh1wX',
    proofPurpose: 'assertionMethod',
    verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
  }
}
;

// const signed_cred = this.issue(sample_key, sample_cred);

this.verify(sample_signed_cred);
