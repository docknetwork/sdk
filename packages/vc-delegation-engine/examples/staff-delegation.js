import { runScenario } from './helpers.js';

const STAFF_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/staff#',
    role: 'ex:role',
    maxSpendingLimit: { '@id': 'ex:maxSpendingLimit', '@type': 'xsd:integer' },
    permittedSystems: 'ex:permittedSystems',
    contractTypes: 'ex:contractTypes',
    validUntil: { '@id': 'ex:validUntil', '@type': 'xsd:dateTime' },
    maxDelegationDepth: { '@id': 'ex:maxDelegationDepth', '@type': 'xsd:integer' },
    revoked: { '@id': 'ex:revoked', '@type': 'xsd:boolean' },
    StaffDelegationCredential: 'ex:StaffDelegationCredential',
    StaffAuthorizationCredential: 'ex:StaffAuthorizationCredential',
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

/**
 * Cedar policy encodes the enforceable parts of the delegation requirements.
 */
const staffPolicies = {
  staticPolicies: `
    // Allow only well-formed presentations; concrete constraint checks live in forbid blocks.
    permit(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      principal == context.vpSigner &&
      context.tailClaims.role == "Senior Accountant" &&
      context.tailDepth <= 3 &&
      context has parentClaims &&
      context.tailClaims.maxSpendingLimit <= 50000 &&
      context.tailClaims.permittedSystemsKey == "erp" &&
      context.tailClaims.contractTypesKey == "vendor"
    };

    // Spend guardrails: any hop exceeding its parent/root is immediately denied.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      context.tailClaims.maxSpendingLimit > context.parentClaims.maxSpendingLimit ||
      context.tailClaims.maxSpendingLimit > context.rootClaims.maxSpendingLimit ||
      (
        context.parentClaims has parentClaims &&
        context.tailClaims.maxSpendingLimit > context.parentClaims.parentClaims.maxSpendingLimit
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.parentClaims has parentClaims &&
        context.tailClaims.maxSpendingLimit >
          context.parentClaims.parentClaims.parentClaims.maxSpendingLimit
      )
    };

    // Time guardrails: no delegation may outlive its parent hierarchy.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      datetime(context.tailClaims.validUntil) > datetime(context.parentClaims.validUntil) ||
      (
        context.parentClaims has parentClaims &&
        datetime(context.tailClaims.validUntil) >
          datetime(context.parentClaims.parentClaims.validUntil)
      ) ||
      (
        context.parentClaims has parentClaims &&
        datetime(context.parentClaims.validUntil) >
          datetime(context.parentClaims.parentClaims.validUntil)
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.parentClaims has parentClaims &&
        datetime(context.parentClaims.parentClaims.validUntil) >
          datetime(context.parentClaims.parentClaims.parentClaims.validUntil)
      )
    };

    // Depth guardrails: maxDelegationDepth must be defined and strictly decreasing.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      context.tailDepth > context.rootClaims.maxDelegationDepth ||
      !(context.parentClaims has maxDelegationDepth) ||
      (
        context.parentClaims has parentClaims &&
        !(context.parentClaims.parentClaims has maxDelegationDepth)
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.maxDelegationDepth >= context.parentClaims.parentClaims.maxDelegationDepth
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.parentClaims has parentClaims &&
        (
          !(context.parentClaims.parentClaims.parentClaims has maxDelegationDepth) ||
          context.parentClaims.parentClaims.maxDelegationDepth >=
            context.parentClaims.parentClaims.parentClaims.maxDelegationDepth
        )
      )
    };

    // Systems guardrails: each hop must keep or reduce permitted systems.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      !(context.parentClaims has permittedSystems) ||
      !(context.tailClaims has permittedSystems) ||
      !context.parentClaims.permittedSystems.containsAll(context.tailClaims.permittedSystems) ||
      (
        context.parentClaims has parentClaims &&
        (
          !(context.parentClaims.parentClaims has permittedSystems) ||
          !context.parentClaims.parentClaims.permittedSystems.containsAll(
            context.parentClaims.permittedSystems
          )
        )
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.parentClaims has parentClaims &&
        (
          !(context.parentClaims.parentClaims.parentClaims has permittedSystems) ||
          !context.parentClaims.parentClaims.parentClaims.permittedSystems.containsAll(
            context.parentClaims.parentClaims.permittedSystems
          )
        )
      )
    };

    // Contract guardrails: each hop must keep or reduce allowed contract types.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"StaffDelegationCredential"
    ) when {
      !(context.parentClaims has contractTypes) ||
      !(context.tailClaims has contractTypes) ||
      !context.parentClaims.contractTypes.containsAll(context.tailClaims.contractTypes) ||
      (
        context.parentClaims has parentClaims &&
        (
          !(context.parentClaims.parentClaims has contractTypes) ||
          !context.parentClaims.parentClaims.contractTypes.containsAll(
            context.parentClaims.contractTypes
          )
        )
      ) ||
      (
        context.parentClaims has parentClaims &&
        context.parentClaims.parentClaims has parentClaims &&
        (
          !(context.parentClaims.parentClaims.parentClaims has contractTypes) ||
          !context.parentClaims.parentClaims.parentClaims.contractTypes.containsAll(
            context.parentClaims.parentClaims.contractTypes
          )
        )
      )
    };
  `,
};

const proofTemplate = {
  type: 'Ed25519Signature2018',
  created: '2025-02-01T12:15:51Z',
  verificationMethod: 'did:corp:senior-accountant#auth-key',
  proofPurpose: 'authentication',
  challenge: 'staff-delegation',
  domain: 'corp.example',
  jws: 'test.staff..signature',
};

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
  revoked = false,
}) {
  const systemsKey = (permittedSystems ?? []).slice().sort().join('|');
  const contractKey = (contractTypes ?? []).slice().sort().join('|');
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
      permittedSystemsKey: systemsKey,
      contractTypes,
      contractTypesKey: contractKey,
      validUntil,
      maxDelegationDepth,
      revoked,
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
  const systemsKey = (permittedSystems ?? []).slice().sort().join('|');
  const contractKey = (contractTypes ?? []).slice().sort().join('|');
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
      permittedSystemsKey: systemsKey,
      contractTypes,
      contractTypesKey: contractKey,
      validUntil,
    },
  };
}

function buildPresentation(verifiableCredential) {
  return {
    '@context': PRESENTATION_CONTEXT,
    type: ['VerifiablePresentation'],
    proof: proofTemplate,
    verifiableCredential,
  };
}

async function runStaffScenario(title, chain, authorizationCredential) {
  await runScenario(
    title,
    buildPresentation([...chain, authorizationCredential]),
    staffPolicies,
  );
}

const rootDelegationId = 'urn:cred:deleg-cfo-fd';

const cfoToDirector = buildDelegationCredential({
  id: rootDelegationId,
  issuer: 'did:corp:cfo',
  subjectId: 'did:corp:finance-director',
  previousCredentialId: null,
  rootCredentialId: rootDelegationId,
  role: 'Finance Director',
  maxSpendingLimit: 1_000_000,
  permittedSystems: ['erp', 'payroll', 'contracts'],
  contractTypes: ['vendor', 'consulting', 'capital'],
  validUntil: '2027-12-31T00:00:00Z',
  maxDelegationDepth: 3,
});

const directorToManager = buildDelegationCredential({
  id: 'urn:cred:deleg-fd-fm',
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
  id: 'urn:cred:deleg-fm-sa',
  issuer: 'did:corp:finance-manager',
  subjectId: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:deleg-fd-fm',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 150_000,
  permittedSystems: ['erp'],
  contractTypes: ['vendor'],
  validUntil: '2026-12-31T00:00:00Z',
  maxDelegationDepth: 0,
});

const authorizedStaffAccess = buildAuthorizationCredential({
  id: 'urn:cred:staff-approval',
  issuer: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:deleg-fm-sa',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 45_000,
  permittedSystems: ['erp'],
  contractTypes: ['vendor'],
  validUntil: '2026-05-31T00:00:00Z',
});

await runStaffScenario(
  'STAFF DELEGATION - VALID',
  [cfoToDirector, directorToManager, managerToSenior],
  authorizedStaffAccess,
);

const invalidManagerDelegation = buildDelegationCredential({
  id: 'urn:cred:deleg-fm-sa-invalid',
  issuer: 'did:corp:finance-manager',
  subjectId: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:deleg-fd-fm',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 600_000,
  permittedSystems: ['erp', 'treasury'],
  contractTypes: ['vendor', 'capital'],
  validUntil: '2027-01-15T00:00:00Z',
  maxDelegationDepth: 1,
});

const invalidStaffAccess = buildAuthorizationCredential({
  id: 'urn:cred:staff-approval-invalid',
  issuer: 'did:corp:senior-accountant',
  previousCredentialId: 'urn:cred:deleg-fm-sa-invalid',
  rootCredentialId: rootDelegationId,
  role: 'Senior Accountant',
  maxSpendingLimit: 250_000,
  permittedSystems: ['erp', 'treasury'],
  contractTypes: ['vendor', 'capital'],
  validUntil: '2027-01-15T00:00:00Z',
});

await runStaffScenario(
  'STAFF DELEGATION - INVALID SCOPE',
  [cfoToDirector, directorToManager, invalidManagerDelegation],
  invalidStaffAccess,
);

