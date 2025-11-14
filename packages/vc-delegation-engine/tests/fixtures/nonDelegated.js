export const nonDelegatedPolicy = `
permit(
  principal,
  action == Credential::Action::"Verify",
  resource
) when {
  principal == context.vpSigner &&
  context.tailDepth == 0
};
`;

export const nonDelegatedPolicies = { staticPolicies: nonDelegatedPolicy };

const GENERIC_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    EmploymentCredential: 'ex:EmploymentCredential',
    ResidencyCredential: 'ex:ResidencyCredential',
    employer: 'ex:employer',
    position: 'ex:position',
    country: 'ex:country',
    region: 'ex:region',
  },
];

export const employmentCredential = {
  '@context': GENERIC_CONTEXT,
  id: 'urn:cred:employment-alice',
  type: ['VerifiableCredential', 'EmploymentCredential'],
  issuer: 'did:example:employer',
  credentialSubject: {
    id: 'did:example:alice',
    employer: 'Example Corp',
    position: 'Engineer',
  },
};

export const residencyCredential = {
  '@context': GENERIC_CONTEXT,
  id: 'urn:cred:residency-alice',
  type: ['VerifiableCredential', 'ResidencyCredential'],
  issuer: 'did:example:government',
  credentialSubject: {
    id: 'did:example:alice',
    country: 'Wonderland',
    region: 'Hearts',
  },
};

export const nonDelegatedPresentation = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2025-02-01T12:00:00Z',
    verificationMethod: 'did:example:alice#key-1',
    proofPurpose: 'authentication',
    challenge: 'non-delegated-demo',
    domain: 'example.org',
    jws: 'test..signature',
  },
  verifiableCredential: [employmentCredential, residencyCredential],
};

