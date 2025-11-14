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
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

export const simpleDelegationPolicy = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource in Credential::Chain::"Action:Verify"
) when {
  principal == context.vpSigner &&
  context.tailDepth <= 2 &&
  context.rootIssuer == Credential::Actor::"did:dock:a" &&
  context.authorizedClaims.creditScore >= 0 &&
  context.authorizedClaims.body == "Issuer of Credit Scores"
};
`;

export const simpleDelegationPolicies = { staticPolicies: simpleDelegationPolicy };

const authorizedDelegation = {
  '@context': CREDIT_DELEGATION_CONTEXT,
  id: 'urn:cred:deleg-a-b',
  type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
  issuer: 'did:dock:a',
  previousCredentialId: null,
  rootCredentialId: 'urn:cred:deleg-a-b',
  credentialSubject: {
    id: 'did:dock:b',
    'https://rdf.dock.io/alpha/2021#mayClaim': ['creditScore'],
    body: 'Issuer of Credit Scores',
  },
};

const authorizedScore = {
  '@context': CREDIT_SCORE_CONTEXT,
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

const unauthorizedDelegation = {
  '@context': CREDIT_DELEGATION_CONTEXT,
  id: 'urn:cred:deleg-a-b',
  type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
  issuer: 'did:dock:a',
  previousCredentialId: null,
  rootCredentialId: 'urn:cred:deleg-a-b',
  credentialSubject: {
    id: 'did:dock:b',
    'https://rdf.dock.io/alpha/2021#mayClaim': ['noClaim'],
  },
};

export const simpleDelegationPresentations = {
  authorized: {
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
    verifiableCredential: [authorizedDelegation, authorizedScore],
  },
  unauthorized: {
    '@context': PRESENTATION_CONTEXT,
    type: ['VerifiablePresentation'],
    proof: {
      type: 'Ed25519Signature2018',
      created: '2025-01-17T12:15:51Z',
      verificationMethod: 'did:dock:d#auth-key',
      proofPurpose: 'authentication',
      challenge: 'credit-score-example',
      domain: 'docklabs.example',
      jws: 'test..signature',
    },
    verifiableCredential: [unauthorizedDelegation, authorizedScore],
  },
};
