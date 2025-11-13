import { runScenario } from './helpers.js';

// This is a cedar verification policy that allows to check the PickUp claim/action
const policyText = `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource in Credential::Chain::"Action:Verify"
) when {
  // Verifier ensures that the principal matches presentation signer
  principal == context.vpSigner &&

  // Verifier ensures the root credential is a Prescription type
  context.rootTypes.contains("https://example.org/credentials#Prescription") &&

  // Verifier ensures the tail credential is a PrescriptionUsage type
  context.tailTypes.contains("https://example.org/credentials#PrescriptionUsage") &&

  // Verifier ensures a specific root issuer, i.e the doctor
  context.rootIssuer == Credential::Actor::"did:test:doctor" &&

  // Verifier ensures that PickUp is true in final list of authorized claims
  context.authorizedClaims.PickUp == true
};

forbid(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource in Credential::Chain::"Action:Verify"
) when {
  // Max depth of 3 delegated credentials
  context.tailDepth > 3
};
`;

const policies = { staticPolicies: policyText };

// NOTE: to validate that a client is authorized to pay or pickup, a valid PEX request should be used
// the delegation verfication ensures that the chain of claims is valid. The cedar policy allows custom business logic.
// This is useful so that the patient cannot issue any claim to their guardian that they want, while still allowing predefined claims.
// The verifier can trace the chain of delegation to the root to access the prescription resource, knowing the presenter is authorized
// to perform actions on it. Actions in this case are simply credential subject claims with true/false booleean value.

// Initial prescription from doctor to pharmacy, delegating the pharmacy the option to delegate the prescription to the patient.
const PRESCRIPTION_CREDENTIAL = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    {
      "@version": 1.1,
      "dock": "https://rdf.dock.io/alpha/2021#",
      "ex": "https://example.org/credentials#",

      "Prescription": "ex:Prescription",
      "DelegationCredential": "ex:DelegationCredential",

      "rootCredentialId": "ex:rootCredentialId",
      "prescribes": { "@id": "ex:prescribes", "@type": "@id" },
      "mayClaim": { "@id": "dock:mayClaim", "@container": "@set" }
    }
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

const PRESENTATION_FIELDS = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "id": "https://example.com/pres/myid",
  "type": [
    "VerifiablePresentation"
  ],
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2025-01-17T12:15:51Z",
    "verificationMethod": "did:test:guardian#test",
    "proofPurpose": "authentication",
    "challenge": "1234567890",
    "domain": "myissuer",
    "jws": "test..test"
  }
};

const PRESCRIPTION_USAGE_BASE_FIELDS = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    {
      "@version": 1.1,
      "dock": "https://rdf.dock.io/alpha/2021#",
      "ex": "https://example.org/credentials#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",

      "PrescriptionUsage": "ex:PrescriptionUsage",
      "DelegationCredential": "ex:DelegationCredential",

      "previousCredentialId": { "@id": "ex:previousCredentialId", "@type": "@id" },
      "rootCredentialId": { "@id": "ex:rootCredentialId", "@type": "@id" },

      "mayClaim": { "@id": "dock:mayClaim", "@container": "@set" },
      "PickUp": { "@id": "ex:PickUp", "@type": "xsd:boolean" },
      "Pay": { "@id": "ex:Pay", "@type": "xsd:boolean" }
    }
  ],
};

await runScenario('GUARDIAN PRESENT', {
  ...PRESENTATION_FIELDS,
  proof: {
    ...PRESENTATION_FIELDS.proof,
    "verificationMethod": "did:test:guardian#test",
  },
  verifiableCredential: [
    PRESCRIPTION_CREDENTIAL,

    // Pharmacy issues pick up and pay authorisation for the patient. The pharmacy has given the patient
    // the ability to delegate picking up and paying for the prescription to the guardian.
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
    // Patient delegates their pick up to the guardian, but they dont want the guardian to be able to pay.
    // For this they put a claim "PickUp: true" and "Pay: false" (or not defined at all) in the credential subject.
    {
      ...PRESCRIPTION_USAGE_BASE_FIELDS,
      id: 'urn:cred:pg-001',
      type: ['VerifiableCredential', 'PrescriptionUsage'], // note no DelegationCredential here, that ends the chain
      issuer: 'did:test:patient',
      previousCredentialId: 'urn:cred:pp-001',
      rootCredentialId: 'urn:cred:pres-001',
      credentialSubject: {
        id: 'did:test:guardian',
        PickUp: true
      },
    },
  ],
}, policies, 'urn:rx:789');

await runScenario('PATIENT PRESENT', {
  ...PRESENTATION_FIELDS,
  proof: {
    ...PRESENTATION_FIELDS.proof,
    "verificationMethod": "did:test:patient#test",
  },
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
        id: 'did:test:patient', PickUp: true, Pay: true
      },
    },
  ],
}, policies, 'urn:rx:789');

await runScenario('GUARDIAN PRESENT NOT ALLOWED PICKUP', {
  ...PRESENTATION_FIELDS,
  proof: {
    ...PRESENTATION_FIELDS.proof,
    "verificationMethod": "did:test:guardian#test",
  },
  verifiableCredential: [
    PRESCRIPTION_CREDENTIAL,

    // Pharmacy issues pick up and pay authorisation for the patient. The pharmacy has given the patient
    // the ability to delegate picking up and paying for the prescription to the guardian.
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
    // Patient delegates pay to the guardian, but they dont want the guardian to be able to pick up.
    // For this they put a claim "Pay: true" and "PickUp: false" (or not defined at all) in the credential subject.
    {
      ...PRESCRIPTION_USAGE_BASE_FIELDS,
      id: 'urn:cred:pg-001',
      type: ['VerifiableCredential', 'PrescriptionUsage'], // note no DelegationCredential here, that ends the chain
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
}, policies, 'urn:rx:789');
