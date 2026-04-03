export const multiDelegationPolicy = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource in Credential::Chain::"Action:Verify"
) when {
  principal == context.vpSigner &&
  context.tailDepth <= 2 &&
  context.rootIssuer == Credential::Actor::"did:dock:a" &&
  context.authorizedClaims.creditScore >= 0
};
`;

export const multiDelegationPolicies = { staticPolicies: multiDelegationPolicy };

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

export const multiDelegationPresentation = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
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
  verifiableCredential: [
    {
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
    },
    {
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
    },
    {
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
    },
  ],
};
