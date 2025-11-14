import jsonld from 'jsonld';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { verifyVPWithDelegation } from '../src/engine.js';
import { authorizeEvaluationsWithCedar } from '../src/cedar-authorization.js';

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
  {
    '@version': 1.1,
    dock: 'https://rdf.dock.io/alpha/2021#',
    ex: 'https://example.org/credentials#',
    DelegationCredential: 'ex:DelegationCredential',
    CreditScoreDelegation: 'ex:CreditScoreDelegation',
    rootCredentialId: 'ex:rootCredentialId',
    previousCredentialId: 'ex:previousCredentialId',
    mayClaim: { '@id': 'dock:mayClaim', '@container': '@set' },
  },
];

const CREDIT_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    CreditScoreCredential: 'ex:CreditScoreCredential',
    creditScore: { '@id': 'ex:creditScore', '@type': 'xsd:integer' },
    previousCredentialId: { '@id': 'ex:previousCredentialId', '@type': '@id' },
    rootCredentialId: { '@id': 'ex:rootCredentialId', '@type': '@id' },
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

const expanded = await jsonld.expand(multiChainPresentation);
const contexts = new Map();
(multiChainPresentation.verifiableCredential ?? []).forEach((vc) => {
  if (vc && typeof vc.id === 'string' && vc['@context']) {
    contexts.set(vc.id, vc['@context']);
  }
});

const result = await verifyVPWithDelegation({
  expandedPresentation: expanded,
  credentialContexts: contexts,
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
