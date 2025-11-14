export const pharmacyPolicy = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource == Credential::Object::"Prescription"
) when {
  principal == context.vpSigner &&
  context.rootTypes.contains("https://example.org/credentials#Prescription") &&
  context.tailTypes.contains("https://example.org/credentials#PrescriptionUsage") &&
  context.rootIssuer == Credential::Actor::"did:test:doctor" &&
  context.authorizedClaims.PickUp == true
};

forbid(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource == Credential::Object::"Prescription"
) when {
  context.tailDepth > 3
};
`;

export const pharmacyPolicies = { staticPolicies: pharmacyPolicy };

const BASE_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
];

export const PRESCRIPTION_CREDENTIAL = {
  '@context': [
    ...BASE_DELEGATION_CONTEXT,
    {
      '@version': 1.1,
      ex: 'https://example.org/credentials#',
      Prescription: 'ex:Prescription',
      prescribes: { '@id': 'ex:prescribes', '@type': '@id' },
    },
  ],
  id: 'urn:cred:pres-001',
  type: ['VerifiableCredential', 'Prescription', 'DelegationCredential'],
  issuer: 'did:test:doctor',
  rootCredentialId: 'urn:cred:pres-001',
  credentialSubject: {
    id: 'did:test:pharmacy',
    'https://rdf.dock.io/alpha/2021#mayClaim': ['Cancel', 'PickUp', 'Pay'],
    prescribes: { id: 'urn:rx:789' },
  },
};

export const PRESENTATION_FIELDS = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: 'https://example.com/pres/myid',
  type: ['VerifiablePresentation'],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2025-01-17T12:15:51Z',
    verificationMethod: 'did:test:guardian#test',
    proofPurpose: 'authentication',
    challenge: '1234567890',
    domain: 'myissuer',
    jws: 'test..test',
  },
};

export const PRESCRIPTION_USAGE_BASE_FIELDS = {
  '@context': [
    ...BASE_DELEGATION_CONTEXT,
    {
      '@version': 1.1,
      ex: 'https://example.org/credentials#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      PrescriptionUsage: 'ex:PrescriptionUsage',
      PickUp: { '@id': 'ex:PickUp', '@type': 'xsd:boolean' },
      Pay: { '@id': 'ex:Pay', '@type': 'xsd:boolean' },
    },
  ],
};

export const pharmacyPresentations = {
  guardianAllowed: {
    ...PRESENTATION_FIELDS,
    proof: { ...PRESENTATION_FIELDS.proof, verificationMethod: 'did:test:guardian#test' },
    verifiableCredential: [
      PRESCRIPTION_CREDENTIAL,
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pp-001',
        type: ['VerifiableCredential', 'PrescriptionUsage', 'DelegationCredential'],
        issuer: 'did:test:pharmacy',
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:patient',
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          PickUp: true,
          Pay: true,
        },
      },
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pg-001',
        type: ['VerifiableCredential', 'PrescriptionUsage'],
        issuer: 'did:test:patient',
        previousCredentialId: 'urn:cred:pp-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:guardian',
          PickUp: true,
        },
      },
    ],
  },
  patient: {
    ...PRESENTATION_FIELDS,
    proof: { ...PRESENTATION_FIELDS.proof, verificationMethod: 'did:test:patient#test' },
    verifiableCredential: [
      PRESCRIPTION_CREDENTIAL,
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pp-001',
        type: ['VerifiableCredential', 'PrescriptionUsage', 'DelegationCredential'],
        issuer: 'did:test:pharmacy',
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          id: 'did:test:patient',
          PickUp: true,
          Pay: true,
        },
      },
    ],
  },
  guardianDenied: {
    ...PRESENTATION_FIELDS,
    proof: { ...PRESENTATION_FIELDS.proof, verificationMethod: 'did:test:guardian#test' },
    verifiableCredential: [
      PRESCRIPTION_CREDENTIAL,
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pp-001',
        type: ['VerifiableCredential', 'PrescriptionUsage', 'DelegationCredential'],
        issuer: 'did:test:pharmacy',
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:patient',
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          PickUp: true,
          Pay: true,
        },
      },
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pg-001',
        type: ['VerifiableCredential', 'PrescriptionUsage'],
        issuer: 'did:test:patient',
        previousCredentialId: 'urn:cred:pp-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:guardian',
          PickUp: false,
          Pay: true,
        },
      },
    ],
  },
};

