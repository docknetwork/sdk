import jsonld from 'jsonld';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { verifyVPWithDelegation } from '../src/engine.js';
import { authorizeEvaluationsWithCedar } from '../src/cedar-authorization.js';
import documentLoader from './document-loader.js';

const policyText = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource
) when {
  principal == context.vpSigner &&
  context.tailDepth <= 2 &&
  context.rootIssuer == Credential::Actor::"did:dock:a" &&
  context.authorizedClaims.creditScore >= 0
};
`;

const policies = { staticPolicies: policyText };

const DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    CreditScoreDelegation: 'ex:CreditScoreDelegation',
  },
];

const CREDIT_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    CreditScoreCredential: 'ex:CreditScoreCredential',
    creditScore: { '@id': 'ex:creditScore', '@type': 'xsd:integer' },
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

const delegationToB = {
  '@context': DELEGATION_CONTEXT,
  id: 'urn:cred:deleg-a-b',
  type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
  issuer: 'did:dock:a',
  previousCredentialId: null,
  rootCredentialId: 'urn:cred:deleg-a-b',
  delegationPolicyId: 'urn:uuid:4f4f0f7b-4c55-4c88-bc44-43f2e7eb2f10',
  delegationPolicyDigest:
    '3f2d2d6f2d7b6e0e9b0cfd5b6ac1e8f5f31d2d41e8d39d6b8d36b1d4c3a8d72a',
  credentialSubject: {
    id: 'did:dock:b',
    'https://rdf.dock.io/alpha/2021#mayClaim': ['creditScore'],
  },
};

const scoreAlice = {
  '@context': CREDIT_CONTEXT,
  id: 'urn:cred:score-alice',
  type: ['VerifiableCredential', 'CreditScoreCredential'],
  issuer: 'did:dock:b',
  previousCredentialId: 'urn:cred:deleg-a-b',
  rootCredentialId: 'urn:cred:deleg-a-b',
  credentialSubject: {
    id: 'did:example:alice',
    creditScore: 760,
  },
};

const scoreBob = {
  '@context': CREDIT_CONTEXT,
  id: 'urn:cred:score-bob',
  type: ['VerifiableCredential', 'CreditScoreCredential'],
  issuer: 'did:dock:b',
  previousCredentialId: 'urn:cred:deleg-a-b',
  rootCredentialId: 'urn:cred:deleg-a-b',
  credentialSubject: {
    id: 'did:example:bob',
    creditScore: 710,
  },
};

const multiChainPresentation = {
  '@context': PRESENTATION_CONTEXT,
  type: ['VerifiablePresentation'],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2025-01-17T12:15:51Z',
    verificationMethod: 'did:dock:b#auth-key',
    proofPurpose: 'authentication',
    challenge: 'multi-delegation',
    domain: 'docklabs.example',
    jws: 'test..signature',
  },
  verifiableCredential: [delegationToB, scoreAlice, scoreBob],
};

const expanded = await jsonld.expand(multiChainPresentation, { documentLoader });
const contexts = new Map();
(multiChainPresentation.verifiableCredential ?? []).forEach((vc) => {
  if (vc && typeof vc.id === 'string' && vc['@context']) {
    contexts.set(vc.id, vc['@context']);
  }
});

const result = await verifyVPWithDelegation({
  expandedPresentation: expanded,
  credentialContexts: contexts,
  documentLoader,
});

let decision = result.decision;
if (policies) {
  const authorization = authorizeEvaluationsWithCedar({
    cedar,
    evaluations: result.evaluations,
    policies,
  });
  decision = authorization.decision;
  if (authorization.authorizations.length > 0) {
    console.log('Authorization decisions:', authorization.authorizations);
  }
}

console.log('Multi-delegation VP decision ->', decision);
if (result.summaries) {
  console.log('Chains verified:', result.summaries.length);
}
if (result.failures && result.failures.length > 0) {
  console.log('failures:', result);
}
