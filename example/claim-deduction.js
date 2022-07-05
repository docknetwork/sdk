import jsonld from 'jsonld';
import deepEqual from 'deep-equal';
import assert from 'assert';
import { acceptCompositeClaims, proveCompositeClaims } from '../src/utils/cd';

const frobs = 'https://example.com/frobs'; // a made-up property

const sampleCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
  ],
  id: 'uuid:50ee5b21-74be-49ac-aeba-42efb35dfe68',
  type: ['VerifiableCredential'],
  issuer: 'did:sample:issuer',
  issuanceDate: '2010-01-01T19:23:24Z',
  credentialSubject: {
    id: 'https://example.com/aaa',
    [frobs]: {
      '@id': 'https://example.com/bbb',
    },
  },
  proof: {
    type: 'Ed25519Signature2018',
    created: '2020-10-06T18:27:10Z',
    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-UCQV_OSlS3sWVgbYDWxPh0AZwvsik0eTflH6sq04H5GISJCTXf1v3279vy5L9MvJUth44TDQ4Dn2Sh-LKZSCw',
    proofPurpose: 'assertionMethod',
    verificationMethod: 'did:sample:issuer#keys-1',
  },
};

const samplePresentation = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  verifiableCredential: [sampleCredential],
  id: 'uuid:6fbb4dd7-9e48-4179-8ba9-c9c750aef4ef',
  holder: 'did:dock:0xeed04b38f07cf2f6aacbbb6694806e6931fd15732a25dbb579d8a3d8e245b360',
};

const sampleRules = [
  // did:sample:issuer is trusted
  {
    if_all: [
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Bound: { Iri: 'did:sample:issuer' } },
      ],
    ],
    then: [
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Bound: { DefaultGraph: true } },
      ],
    ],
  },
  // if a frobs b then b frobs a
  {
    if_all: [
      [
        { Unbound: 'a' },
        { Bound: { Iri: frobs } },
        { Unbound: 'b' },
        { Unbound: 'g' },
      ],
    ],
    then: [
      [
        { Unbound: 'b' },
        { Bound: { Iri: frobs } },
        { Unbound: 'a' },
        { Unbound: 'g' },
      ],
    ],
  },
];

// we will be proving and verifying the statement [aaa frobs bbb]
const sampleToProve = [
  { Iri: 'https://example.com/bbb' },
  { Iri: frobs },
  { Iri: 'https://example.com/aaa' },
  { DefaultGraph: true },
];

// accept a presentation with a proof of composite claims
// return all the claims which are now known to be true
async function accept(presentation) {
  const v = await verify(presentation);
  if (!v.verified) {
    throw new Error('bad presentation');
  }
  const expanded = await jsonld.expand(presentation);
  return acceptCompositeClaims(expanded, sampleRules);
}

// Use the assumptions encoded in the presention to prove a statement
// the statement to prove in this case is sampleToProve
// Returns a copy of the presentation with the proof attached.
//
// A function similar to this might, for example, be called by a holder before
// submitting a presentation.
async function withProof(presentation) {
  const expanded = await jsonld.expand(presentation);
  const ret = JSON.parse(JSON.stringify(presentation)); // defensive copy
  const proof = await proveCompositeClaims(expanded, [sampleToProve], sampleRules);
  ret['https://www.dock.io/rdf2020#logicV1'] = proof;
  return ret;
}

// this is a dummy function, see ./examples/vcdm.js for an example of verification
async function verify(_presentation) { // eslint-disable-line no-unused-vars
  // dummy body
  return { verified: true };
}

function containsClaim(claims, claim) {
  return claims.some((c) => deepEqual(c, claim));
}

async function main() {
  assert(!containsClaim(await accept(samplePresentation), sampleToProve));
  const wp = await withProof(samplePresentation);
  assert(containsClaim(await accept(wp), sampleToProve));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
