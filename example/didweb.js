import VerifiableCredential from '../src/verifiable-credential';

import {
  DIDKeyResolver,
  MultiResolver,
  UniversalResolver,
} from '../src/resolver';

// Create a resolver in order to lookup DIDs for verifying
const universalResolverUrl = 'https://uniresolver.io';
const resolver = new MultiResolver(
  {
    key: new DIDKeyResolver(), // did:key resolution
  },
  new UniversalResolver(universalResolverUrl),
);

// Taken from https://github.com/w3c-ccg/vc-examples/blob/master/docs/chapi-http-edu/vc.json
// This credential is signed with a Ed25519Signature2018 key (similar to what Dock typically uses)
const exampleOne = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
  ],
  id: 'http://example.gov/credentials/3732',
  type: ['VerifiableCredential', 'UniversityDegreeCredential'],
  issuer: 'did:web:vc.transmute.world',
  issuanceDate: '2020-03-16T22:37:26.544Z',
  credentialSubject: {
    id: 'did:key:z6MkjRagNiMu91DduvCvgEsqLZDVzrJzFrwahc4tXLt9DoHd',
    degree: {
      type: 'BachelorDegree',
      name: 'Bachelor of Science and Arts',
    },
  },
  proof: {
    type: 'Ed25519Signature2018',
    created: '2020-04-02T18:28:08Z',
    verificationMethod: 'did:web:vc.transmute.world#z6MksHh7qHWvybLg5QTPPdG2DgEjjduBDArV9EF9mRiRzMBN',
    proofPurpose: 'assertionMethod',
    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..YtqjEYnFENT7fNW-COD0HAACxeuQxPKAmp4nIl8jYAu__6IH2FpSxv81w-l5PvE1og50tS9tH8WyXMlXyo45CA',
  },
};

async function verify(credentialJSON) {
  // Incrementally build a verifiable credential
  const credential = new VerifiableCredential();
  credential.setFromJSON(credentialJSON);

  console.log('Verifying credential:', credential.toJSON());

  // Verify the credential
  const verifyResult = await credential.verify({
    resolver,
    compactProof: true,
    forceRevocationCheck: false,
  });

  if (verifyResult.verified) {
    console.log('Credential has been verified!', verifyResult.results);
  } else {
    // console.log('results', verifyResult.results[0].error && verifyResult.results[0].error.details)
    // console.log('results', verifyResult.results[0].error && verifyResult.results[0].error.details)
    throw verifyResult.error;
  }
}

async function main() {
  try {
    await verify(exampleOne);
  } catch (e) {
    console.error('Error verifying credential', e);
    process.exit(1);
  }

  // Exit
  process.exit(0);
}

main();
