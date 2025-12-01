const STAFF_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    staff: 'https://example.org/staff#',
    role: 'staff:role',
    maxSpendingLimit: 'staff:maxSpendingLimit',
    permittedSystems: 'staff:permittedSystems',
    contractTypes: 'staff:contractTypes',
    validUntil: 'staff:validUntil',
    maxDelegationDepth: 'staff:maxDelegationDepth',
    revoked: 'staff:revoked',
    StaffDelegationCredential: 'staff:StaffDelegationCredential',
    StaffAuthorizationCredential: 'staff:StaffAuthorizationCredential',
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

export const staffPolicies = {
  staticPolicies: `
    permit(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      principal == context.vpSigner &&
      context.tailClaims.role == "Senior Accountant" &&
      context.tailDepth == 3 &&
      context has parentClaims &&
      context.tailClaims.maxSpendingLimit <= context.parentClaims.maxSpendingLimit &&
      context.parentClaims.maxSpendingLimit <= context.parentClaims.parentClaims.maxSpendingLimit &&
      datetime(context.tailClaims.validUntil) <= datetime(context.parentClaims.validUntil) &&
      datetime(context.parentClaims.validUntil) <= datetime(context.parentClaims.parentClaims.validUntil) &&
      context.parentClaims has permittedSystems &&
      context.parentClaims.parentClaims has permittedSystems &&
      context.parentClaims.permittedSystems.containsAll(context.tailClaims.permittedSystems) &&
      context.parentClaims.parentClaims.permittedSystems.containsAll(
        context.parentClaims.permittedSystems
      ) &&
      context.parentClaims has contractTypes &&
      context.parentClaims.parentClaims has contractTypes &&
      context.parentClaims.contractTypes.containsAll(context.tailClaims.contractTypes) &&
      context.parentClaims.parentClaims.contractTypes.containsAll(
        context.parentClaims.contractTypes
      )
    };
  `,
};

function toKey(values = []) {
  return (values ?? []).slice().sort().join('|');
}

function buildDelegationCredential({
  id,
  issuer,
  subjectId,
  previousCredentialId,
  rootCredentialId,
  role,
  maxSpendingLimit,
  permittedSystems,
  contractTypes,
  validUntil,
  maxDelegationDepth,
}) {
  return {
    '@context': STAFF_DELEGATION_CONTEXT,
    id,
    type: ['VerifiableCredential', 'StaffDelegationCredential', 'DelegationCredential'],
    issuer,
    previousCredentialId,
    rootCredentialId,
    credentialSubject: {
      id: subjectId,
      role,
      maxSpendingLimit,
      permittedSystems,
      permittedSystemsKey: toKey(permittedSystems),
      contractTypes,
      contractTypesKey: toKey(contractTypes),
      validUntil,
      maxDelegationDepth,
    },
  };
}

function buildAuthorizationCredential({
  id,
  issuer,
  previousCredentialId,
  rootCredentialId,
  role,
  maxSpendingLimit,
  permittedSystems,
  contractTypes,
  validUntil,
}) {
  return {
    '@context': STAFF_DELEGATION_CONTEXT,
    id,
    type: ['VerifiableCredential', 'StaffAuthorizationCredential'],
    issuer,
    previousCredentialId,
    rootCredentialId,
    credentialSubject: {
      id: issuer,
      role,
      maxSpendingLimit,
      permittedSystems,
      permittedSystemsKey: toKey(permittedSystems),
      contractTypes,
      contractTypesKey: toKey(contractTypes),
      validUntil,
    },
  };
}

function buildPresentation(verifiableCredential) {
  return {
    '@context': PRESENTATION_CONTEXT,
    type: ['VerifiablePresentation'],
    proof: {
      type: 'Ed25519Signature2018',
      created: '2025-02-01T12:15:51Z',
      verificationMethod: 'did:corp:senior-accountant#auth-key',
      proofPurpose: 'authentication',
      challenge: 'staff-delegation',
      domain: 'corp.example',
      jws: 'test.staff..signature',
    },
    verifiableCredential,
  };
}

const rootDelegationId = 'urn:cred:staff-root';

const cfoToDirector = buildDelegationCredential({
  id: rootDelegationId,
  issuer: 'did:corp:cfo',
  subjectId: 'did:corp:finance-director',
  previousCredentialId: null,
  rootCredentialId: rootDelegationId,
  role: 'Finance Director',
  maxSpendingLimit: 1_000_000,
  permittedSystems: ['erp', 'contracts', 'payroll'],
  contractTypes: ['vendor', 'consulting', 'capital'],
  validUntil: '2027-12-31T00:00:00Z',
  maxDelegationDepth: 3,
});

const directorToManager = buildDelegationCredential({
  id: 'urn:cred:staff-director-manager',
  issuer: 'did:corp:finance-director',
  subjectId: 'did:corp:finance-manager',
  previousCredentialId: rootDelegationId,
  rootCredentialId: rootDelegationId,
  role: 'Finance Manager',
  maxSpendingLimit: 500_000,
  permittedSystems: ['erp', 'contracts'],
  contractTypes: ['vendor', 'consulting'],
  validUntil: '2027-06-30T00:00:00Z',
  maxDelegationDepth: 2,
});

const managerToSenior = buildDelegationCredential({
  id: 'urn:cred:staff-manager-senior',
  issuer: 'did:corp:finance-manager',
  subjectId: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:staff-director-manager',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 150_000,
  permittedSystems: ['erp'],
  contractTypes: ['vendor'],
  validUntil: '2026-12-31T00:00:00Z',
  maxDelegationDepth: 1,
});

const validAuthorization = buildAuthorizationCredential({
  id: 'urn:cred:staff-authorization',
  issuer: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:staff-manager-senior',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 45_000,
  permittedSystems: ['erp'],
  contractTypes: ['vendor'],
  validUntil: '2026-05-31T00:00:00Z',
});

const invalidAuthorization = buildAuthorizationCredential({
  id: 'urn:cred:staff-authorization-invalid',
  issuer: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:staff-manager-senior',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 200_000,
  permittedSystems: ['erp', 'treasury'],
  contractTypes: ['vendor', 'capital'],
  validUntil: '2027-06-30T00:00:00Z',
});

export const staffPresentations = {
  valid: buildPresentation([
    cfoToDirector,
    directorToManager,
    managerToSenior,
    validAuthorization,
  ]),
  invalid: buildPresentation([
    cfoToDirector,
    directorToManager,
    managerToSenior,
    invalidAuthorization,
  ]),
};

