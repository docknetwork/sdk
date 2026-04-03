import pharmacyDelegationPolicyDoc from './delegation-pharmacy-policy.json' with { type: 'json' };

export { pharmacyDelegationPolicyDoc };

/** SHA-256 hex of json-canonicalize(policy document) */
export const PHARMACY_DELEGATION_POLICY_DIGEST =
  'e63a871e132696b8a50fb29515ddfc4d88fd01f35cee9df8b230cf472c409e3f';

export const PHARMACY_DELEGATION_POLICY_ID = pharmacyDelegationPolicyDoc.id;

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

const VC_DATES = {
  issuanceDate: '2026-03-20T12:00:00Z',
  expirationDate: '2026-06-10T12:00:00Z',
};

const CAPABILITY_CONTEXT = {
  '@version': 1.1,
  ex: 'https://example.org/credentials#',
  allowedClaims: 'ex:allowedClaims',
  prescriptionResourceIds: 'ex:prescriptionResourceIds',
  canPickUp: { '@id': 'ex:canPickUp', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
  canPay: { '@id': 'ex:canPay', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
  canCancel: { '@id': 'ex:canCancel', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
};

export const PRESCRIPTION_CREDENTIAL = {
  '@context': [
    ...BASE_DELEGATION_CONTEXT,
    CAPABILITY_CONTEXT,
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
  issuanceDate: VC_DATES.issuanceDate,
  expirationDate: VC_DATES.expirationDate,
  rootCredentialId: 'urn:cred:pres-001',
  delegationPolicyId: PHARMACY_DELEGATION_POLICY_ID,
  delegationPolicyDigest: PHARMACY_DELEGATION_POLICY_DIGEST,
  delegationRoleId: 'pharmacy',
  credentialSubject: {
    id: 'did:test:pharmacy',
    'https://rdf.dock.io/alpha/2021#mayClaim': ['Cancel', 'PickUp', 'Pay'],
    prescribes: { id: 'urn:rx:789' },
    allowedClaims: ['PickUp', 'Pay'],
    prescriptionResourceIds: ['urn:rx:789'],
    canPickUp: true,
    canPay: true,
    PickUp: true,
    Pay: true,
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
    CAPABILITY_CONTEXT,
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
        issuanceDate: VC_DATES.issuanceDate,
        expirationDate: VC_DATES.expirationDate,
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        delegationRoleId: 'patient',
        credentialSubject: {
          id: 'did:test:patient',
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          PickUp: true,
          Pay: true,
          allowedClaims: ['PickUp'],
          prescriptionResourceIds: ['urn:rx:789'],
          canPickUp: true,
        },
      },
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pg-001',
        type: ['VerifiableCredential', 'PrescriptionUsage'],
        issuer: 'did:test:patient',
        issuanceDate: VC_DATES.issuanceDate,
        expirationDate: VC_DATES.expirationDate,
        previousCredentialId: 'urn:cred:pp-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:guardian',
          PickUp: true,
          canPickUp: true,
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
        issuanceDate: VC_DATES.issuanceDate,
        expirationDate: VC_DATES.expirationDate,
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        delegationRoleId: 'patient',
        credentialSubject: {
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          id: 'did:test:patient',
          PickUp: true,
          Pay: true,
          allowedClaims: ['PickUp'],
          prescriptionResourceIds: ['urn:rx:789'],
          canPickUp: true,
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
        issuanceDate: VC_DATES.issuanceDate,
        expirationDate: VC_DATES.expirationDate,
        previousCredentialId: 'urn:cred:pres-001',
        rootCredentialId: 'urn:cred:pres-001',
        delegationRoleId: 'patient',
        credentialSubject: {
          id: 'did:test:patient',
          'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
          PickUp: true,
          Pay: true,
          allowedClaims: ['PickUp'],
          prescriptionResourceIds: ['urn:rx:789'],
          canPickUp: true,
        },
      },
      {
        ...PRESCRIPTION_USAGE_BASE_FIELDS,
        id: 'urn:cred:pg-001',
        type: ['VerifiableCredential', 'PrescriptionUsage'],
        issuer: 'did:test:patient',
        issuanceDate: VC_DATES.issuanceDate,
        expirationDate: VC_DATES.expirationDate,
        previousCredentialId: 'urn:cred:pp-001',
        rootCredentialId: 'urn:cred:pres-001',
        credentialSubject: {
          id: 'did:test:guardian',
          PickUp: false,
          Pay: true,
          canPickUp: false,
        },
      },
    ],
  },
};
