import { runScenario } from './helpers.js';

const policyText = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource
) when {
  principal == context.vpSigner &&
  context.tailDepth <= 2 &&
  context.rootIssuer == Credential::Actor::"did:dock:a" &&
  context.authorizedClaims.creditScore >= 0 &&
  context.authorizedClaims.hasCCJs == false &&
  context.authorizedClaims.body == "Issuer of Credit Scores"
};
`;

const policies = { staticPolicies: policyText };

const CREDIT_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    CreditScoreDelegation: 'ex:CreditScoreDelegation',
    body: 'ex:body',
  },
];

const CREDIT_SCORE_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    CreditScoreCredential: 'ex:CreditScoreCredential',
    creditScore: { '@id': 'ex:creditScore', '@type': 'xsd:integer' },
    hasLoans: { '@id': 'ex:hasLoans', '@type': 'xsd:boolean' },
    hasCCJs: { '@id': 'ex:hasCCJs', '@type': 'xsd:boolean' },
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

await runScenario('AUTHORIZED CREDIT SCORE', {
  '@context': PRESENTATION_CONTEXT,
  type: ['VerifiablePresentation'],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2025-01-17T12:15:51Z',
    verificationMethod: 'did:dock:b#auth-key',
    proofPurpose: 'authentication',
    challenge: 'credit-score-example',
    domain: 'docklabs.example',
    jws: 'test..signature',
  },
  verifiableCredential: [
    {
      '@context': CREDIT_DELEGATION_CONTEXT,
      id: 'urn:cred:deleg-a-b',
      type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
      issuer: 'did:dock:a',
      previousCredentialId: null,
      rootCredentialId: 'urn:cred:deleg-a-b',
      credentialSubject: {
        // did:dock:b or relying parties may claim all fields, besides body
        id: 'did:dock:b',
        'https://rdf.dock.io/alpha/2021#mayClaim': ['creditScore', 'hasLoans', 'hasCCJs'],
        body: 'Issuer of Credit Scores',
      },
    },
    // First credential issues a credit score attestation but delegates loan/CCJ check to 3rd entity
    {
      '@context': CREDIT_SCORE_CONTEXT,
      id: 'urn:cred:score-alice',
      type: ['VerifiableCredential', 'CreditScoreCredential', 'DelegationCredential'],
      issuer: 'did:dock:b',
      previousCredentialId: 'urn:cred:deleg-a-b',
      rootCredentialId: 'urn:cred:deleg-a-b',
      credentialSubject: {
        // did:dock:c may claim that alice has loans or has ccjs
        id: 'did:dock:c',
        'https://rdf.dock.io/alpha/2021#mayClaim': ['hasLoans', 'hasCCJs'],
        creditScore: 760,
      },
    },
    // Last credential issues has loans/has CCJs attestations
    {
      '@context': CREDIT_SCORE_CONTEXT,
      id: 'urn:cred:hasloansorccjs-alice',
      type: ['VerifiableCredential', 'CreditScoreCredential'],
      issuer: 'did:dock:c',
      previousCredentialId: 'urn:cred:score-alice',
      rootCredentialId: 'urn:cred:deleg-a-b',
      credentialSubject: {
        id: 'did:example:alice',
        hasLoans: true,
        hasCCJs: false,

        // Even if this credential includes a credit score which it is not authorized to claim, it wont be in the authorized claims list
        creditScore: -100,
      },
    },
  ],
}, policies);
