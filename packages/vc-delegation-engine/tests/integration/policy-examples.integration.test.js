import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import jsonld from 'jsonld';

import { verifyVPWithDelegation } from '../../src/index.js';
import { DelegationErrorCodes } from '../../src/errors.js';
import { computePolicyDigestHex } from '../../src/delegation-policy-digest.js';
import { validateDelegationPolicy } from '../../src/delegation-policy-validate.js';
import {
  pharmacyIntegrationPolicy,
  travelIntegrationPolicy,
  PHARMACY_INTEGRATION_DIGEST,
  TRAVEL_INTEGRATION_DIGEST,
  createPolicyIntegrationDocumentLoader,
  buildPolicyIntegrationPresentation,
  buildPharmacyIntegrationDelegationVc,
  buildPharmacyIntegrationLeafVc,
  buildTravelIntegrationDelegationVc,
  PHARMACY_INTEGRATION_DATES_OK,
  PHARMACY_INTEGRATION_DATES_CHILD_AFTER_PARENT,
  pharmacySubjectDoctor,
  pharmacySubjectPharmacy,
  pharmacySubjectPatient,
  pharmacySubjectLeaf,
  travelSubjectAgency,
  travelSubjectRegional,
  travelSubjectAgent,
} from '../fixtures/policyIntegrationExamples.js';

const ISSUER_DOCTOR = 'did:test:doctor';
const ISSUER_PHARMACY = 'did:test:pharmacy';
const ISSUER_PATIENT = 'did:test:patient';
const ISSUER_CORP = 'did:test:corp';
const ISSUER_TRAVEL_AGENCY_ENTITY = 'did:test:travel-agency';
const ISSUER_REGIONAL = 'did:test:regional';
const ISSUER_AGENT = 'did:test:agent';

const TRAVEL_VC_AGENCY = ['VerifiableCredential', 'TravelAgencyCredential', 'DelegationCredential'];
const TRAVEL_VC_REGIONAL = ['VerifiableCredential', 'TravelRegionalCredential', 'DelegationCredential'];
const TRAVEL_VC_AGENT = ['VerifiableCredential', 'TravelAgentCredential', 'DelegationCredential'];

const ROLE_TRAVEL_AGENCY = 'travel-agency';
const ROLE_REGIONAL_MANAGER = 'regional-manager';
const ROLE_TRAVEL_AGENT = 'travel-agent';
const ROUTE_NYC_LAX = 'US-NYC-LAX';
const ROUTE_SFO_SEA = 'US-SFO-SEA';
const ROUTES_PARENT_ONE = [ROUTE_NYC_LAX];
const ROUTES_CHILD_PAIR = [ROUTE_NYC_LAX, ROUTE_SFO_SEA];

async function verifyIntegrationPresentation(presentation, documentLoader) {
  const expandedPresentation = await jsonld.expand(JSON.parse(JSON.stringify(presentation)), { documentLoader });
  const credentialContexts = new Map();
  (presentation.verifiableCredential ?? []).forEach((vc) => {
    if (vc && typeof vc.id === 'string' && vc['@context']) {
      credentialContexts.set(vc.id, vc['@context']);
    }
  });
  return verifyVPWithDelegation({
    expandedPresentation,
    credentialContexts,
    documentLoader,
  });
}

function shallowPharmacyPolicyDepth0() {
  const shallow = structuredClone(pharmacyIntegrationPolicy);
  shallow.id = 'urn:test:delegation-policy:pharmacy-shallow-depth';
  shallow.ruleset.overallConstraints.maxDelegationDepth = 0;
  return shallow;
}

describe('policy example integration (pharmacy ruleset)', () => {
  let documentLoader;

  beforeAll(() => {
    validateDelegationPolicy(pharmacyIntegrationPolicy);
    documentLoader = createPolicyIntegrationDocumentLoader();
  });

  it('accepts a single delegation credential (pharmacy role)', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:single',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const presentation = buildPolicyIntegrationPresentation([root]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('allow');
    expect(result.failures).toHaveLength(0);
  });

  it('accepts pharmacy → patient → non-delegation leaf', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
    });
    const leaf = buildPharmacyIntegrationLeafVc({
      id: 'urn:pharm:int:leaf',
      issuer: ISSUER_PATIENT,
      previousCredentialId: patient.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectLeaf,
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient, leaf]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('allow');
  });

  it('policy chain allows doctor → patient (role graph skip); verified via resolveAndVerifyDelegationPolicy', async () => {
    const { resolveAndVerifyDelegationPolicy } = await import('../../src/delegation-policy-chain.js');
    const chain = [
      {
        id: 'urn:pharm:int:doc-root',
        type: ['DelegationCredential'],
        delegationPolicyId: pharmacyIntegrationPolicy.id,
        delegationPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
        delegationRoleId: 'doctor',
        issuanceDate: PHARMACY_INTEGRATION_DATES_OK.issuanceDate,
        expirationDate: PHARMACY_INTEGRATION_DATES_OK.expirationDate,
        credentialSubject: pharmacySubjectDoctor,
      },
      {
        id: 'urn:pharm:int:pat-direct',
        type: ['DelegationCredential'],
        delegationPolicyId: pharmacyIntegrationPolicy.id,
        delegationPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
        delegationRoleId: 'patient',
        issuanceDate: PHARMACY_INTEGRATION_DATES_OK.issuanceDate,
        expirationDate: PHARMACY_INTEGRATION_DATES_OK.expirationDate,
        credentialSubject: pharmacySubjectPatient,
      },
    ];
    await expect(
      resolveAndVerifyDelegationPolicy({
        chain,
        rootPolicyId: pharmacyIntegrationPolicy.id,
        rootPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
        documentLoader: async () => ({ document: structuredClone(pharmacyIntegrationPolicy) }),
      }),
    ).resolves.toBeDefined();
  });

  it('accepts guardian delegation credential with empty capability subject', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:g-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:g-patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
    });
    const guardian = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:g-guardian',
      issuer: ISSUER_PATIENT,
      roleId: 'guardian',
      previousCredentialId: patient.id,
      rootCredentialId: root.id,
      credentialSubject: { id: 'did:test:guardian' },
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient, guardian]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('allow');
  });

  it('rejects delegationPolicyDigest mismatch', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:bad-digest',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
      delegationPolicyDigest: '0'.repeat(64),
    });
    const presentation = buildPolicyIntegrationPresentation([root]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_DIGEST_MISMATCH)).toBe(true);
  });

  it('rejects child credential expiring after parent', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:exp-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
      dateFields: PHARMACY_INTEGRATION_DATES_OK,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:exp-patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
      dateFields: PHARMACY_INTEGRATION_DATES_CHILD_AFTER_PARENT,
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_LIFETIME_INVALID)).toBe(true);
  });

  it('rejects subject field not allowed by role (capability-only disclosure)', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:extra-field',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: {
        ...pharmacySubjectPharmacy,
        internalNote: 'must-not-appear',
      },
    });
    const presentation = buildPolicyIntegrationPresentation([root]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ROLE_INVALID)).toBe(true);
  });

  it('rejects patient allowedClaims broader than role grant schema', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:br-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:br-patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: {
        ...pharmacySubjectPatient,
        allowedClaims: ['PickUp', 'Pay'],
      },
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_CAPABILITY_INVALID)).toBe(true);
  });

  it('rejects guardian role credential that discloses a capability field', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:gr-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:gr-patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
    });
    const guardian = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:gr-bad',
      issuer: ISSUER_PATIENT,
      roleId: 'guardian',
      previousCredentialId: patient.id,
      rootCredentialId: root.id,
      credentialSubject: {
        id: 'did:test:guardian',
        canPickUp: true,
      },
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient, guardian]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ROLE_INVALID)).toBe(true);
  });

  it('rejects inverted role ancestry (patient then pharmacy)', async () => {
    const patientFirst = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:inv-p',
      issuer: ISSUER_DOCTOR,
      roleId: 'patient',
      credentialSubject: pharmacySubjectPatient,
    });
    const pharmacySecond = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:inv-ph',
      issuer: ISSUER_PHARMACY,
      roleId: 'pharmacy',
      previousCredentialId: patientFirst.id,
      rootCredentialId: patientFirst.id,
      credentialSubject: pharmacySubjectPatient,
    });
    const presentation = buildPolicyIntegrationPresentation([patientFirst, pharmacySecond]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ROLE_INVALID)).toBe(true);
  });

  it('rejects leaf allowedClaims broader than patient role (capability validation before monotonicity)', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:mono-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:mono-p',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
    });
    const leaf = buildPharmacyIntegrationLeafVc({
      id: 'urn:pharm:int:mono-leaf',
      issuer: ISSUER_PATIENT,
      previousCredentialId: patient.id,
      rootCredentialId: root.id,
      credentialSubject: {
        ...pharmacySubjectLeaf,
        allowedClaims: ['PickUp', 'Pay'],
      },
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient, leaf]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_CAPABILITY_INVALID)).toBe(true);
  });

  it('rejects chain when maxDelegationDepth is exceeded', async () => {
    const shallow = shallowPharmacyPolicyDepth0();
    const shallowDigest = computePolicyDigestHex(shallow);
    const loader = async (url) => {
      if (url === shallow.id) {
        return { contextUrl: null, documentUrl: url, document: structuredClone(shallow) };
      }
      return documentLoader(url);
    };
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:shallow-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
      delegationPolicyId: shallow.id,
      delegationPolicyDigest: shallowDigest,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:shallow-p',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
      delegationPolicyId: shallow.id,
      delegationPolicyDigest: shallowDigest,
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient]);
    const result = await verifyIntegrationPresentation(presentation, loader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_DEPTH_EXCEEDED)).toBe(true);
  });

  it('rejects child delegationPolicyId that does not match root', async () => {
    const root = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:id-root',
      issuer: ISSUER_DOCTOR,
      roleId: 'pharmacy',
      credentialSubject: pharmacySubjectPharmacy,
    });
    const patient = buildPharmacyIntegrationDelegationVc({
      id: 'urn:pharm:int:id-patient',
      issuer: ISSUER_PHARMACY,
      roleId: 'patient',
      previousCredentialId: root.id,
      rootCredentialId: root.id,
      credentialSubject: pharmacySubjectPatient,
      delegationPolicyId: 'urn:test:delegation-policy:other',
      delegationPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
    });
    const presentation = buildPolicyIntegrationPresentation([root, patient]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ID_MISMATCH)).toBe(true);
  });

  it('stable digest for bundled pharmacy example policy', () => {
    expect(PHARMACY_INTEGRATION_DIGEST).toBe(
      'f9be6bd54c970faf8068517f53323ffb9f3237942b6b4720ffe2ee73b062db73',
    );
  });
});

describe('policy example integration (travel ruleset)', () => {
  let documentLoader;

  beforeAll(() => {
    validateDelegationPolicy(travelIntegrationPolicy);
    documentLoader = createPolicyIntegrationDocumentLoader();
  });

  it('accepts travel-agency → regional-manager → travel-agent chain', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:agency',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const regional = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:regional',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_REGIONAL_MANAGER,
      type: TRAVEL_VC_REGIONAL,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: travelSubjectRegional,
    });
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:agent',
      issuer: ISSUER_REGIONAL,
      roleId: ROLE_TRAVEL_AGENT,
      type: TRAVEL_VC_AGENT,
      previousCredentialId: regional.id,
      rootCredentialId: agency.id,
      credentialSubject: travelSubjectAgent,
    });
    const presentation = buildPolicyIntegrationPresentation([agency, regional, agent]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('allow');
  });

  it('rejects purchaseLimit greater than parent credential (numeric monotonicity)', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:pl-a',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const regional = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:pl-r',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_REGIONAL_MANAGER,
      type: TRAVEL_VC_REGIONAL,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectRegional,
        purchaseLimit: 800,
      },
    });
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:pl-g',
      issuer: ISSUER_REGIONAL,
      roleId: ROLE_TRAVEL_AGENT,
      type: TRAVEL_VC_AGENT,
      previousCredentialId: regional.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectAgent,
        purchaseLimit: 900,
      },
    });
    const presentation = buildPolicyIntegrationPresentation([agency, regional, agent]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION)).toBe(true);
  });

  it('rejects allowedRoutes not a subset of parent', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rt-a',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const regional = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rt-r',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_REGIONAL_MANAGER,
      type: TRAVEL_VC_REGIONAL,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectRegional,
        allowedRoutes: ROUTES_PARENT_ONE,
      },
    });
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rt-g',
      issuer: ISSUER_REGIONAL,
      roleId: ROLE_TRAVEL_AGENT,
      type: TRAVEL_VC_AGENT,
      previousCredentialId: regional.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectAgent,
        allowedRoutes: ROUTES_CHILD_PAIR,
      },
    });
    const presentation = buildPolicyIntegrationPresentation([agency, regional, agent]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION)).toBe(true);
  });

  it('rejects travel-agent disclosing reserveHotels (not granted to travel-agent role)', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rh-a',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const regional = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rh-r',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_REGIONAL_MANAGER,
      type: TRAVEL_VC_REGIONAL,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: travelSubjectRegional,
    });
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:rh-g',
      issuer: ISSUER_REGIONAL,
      roleId: ROLE_TRAVEL_AGENT,
      type: TRAVEL_VC_AGENT,
      previousCredentialId: regional.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectAgent,
        reserveHotels: true,
      },
    });
    const presentation = buildPolicyIntegrationPresentation([agency, regional, agent]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ROLE_INVALID)).toBe(true);
  });

  it('rejects regional-manager allowedRoutes enum violation vs grant schema', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:en-a',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const regional = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:en-r',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_REGIONAL_MANAGER,
      type: TRAVEL_VC_REGIONAL,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: {
        ...travelSubjectRegional,
        allowedRoutes: [ROUTE_NYC_LAX, 'EU-PAR-LON'],
      },
    });
    const presentation = buildPolicyIntegrationPresentation([agency, regional]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_CAPABILITY_INVALID)).toBe(true);
  });

  it('rejects travel-agent → travel-agency (role order inconsistent with policy graph)', async () => {
    const sharedNarrowSubject = {
      id: 'did:test:shared',
      allowedRoutes: ROUTES_PARENT_ONE,
      purchaseLimit: 500,
      reserveFlights: true,
    };
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:inv-agent',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENT,
      credentialSubject: sharedNarrowSubject,
    });
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:inv-agency',
      issuer: ISSUER_AGENT,
      roleId: ROLE_TRAVEL_AGENCY,
      type: TRAVEL_VC_AGENCY,
      previousCredentialId: agent.id,
      rootCredentialId: agent.id,
      credentialSubject: sharedNarrowSubject,
    });
    const presentation = buildPolicyIntegrationPresentation([agent, agency]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('deny');
    expect(result.failures.some((f) => f.code === DelegationErrorCodes.POLICY_ROLE_INVALID)).toBe(true);
  });

  it('allows travel-agency → travel-agent when regional-manager credential is omitted (graph descendant)', async () => {
    const agency = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:skip-a',
      issuer: ISSUER_CORP,
      roleId: ROLE_TRAVEL_AGENCY,
      credentialSubject: travelSubjectAgency,
    });
    const agent = buildTravelIntegrationDelegationVc({
      id: 'urn:travel:int:skip-g',
      issuer: ISSUER_TRAVEL_AGENCY_ENTITY,
      roleId: ROLE_TRAVEL_AGENT,
      type: TRAVEL_VC_AGENT,
      previousCredentialId: agency.id,
      rootCredentialId: agency.id,
      credentialSubject: travelSubjectAgent,
    });
    const presentation = buildPolicyIntegrationPresentation([agency, agent]);
    const result = await verifyIntegrationPresentation(presentation, documentLoader);
    expect(result.decision).toBe('allow');
  });

  it('stable digest for bundled travel example policy', () => {
    expect(TRAVEL_INTEGRATION_DIGEST).toBe(
      'a8539feda57be9b15a1c0545f6ade5de86632d9e8a8095692be9dbb5f996342c',
    );
  });
});

describe('policy example integration (documentLoader)', () => {
  it('resolveAndVerifyDelegationPolicy requires documentLoader (VP path may fail earlier on remote @context without a loader)', async () => {
    const { resolveAndVerifyDelegationPolicy } = await import('../../src/delegation-policy-chain.js');
    const chain = [
      {
        id: 'urn:pharm:int:no-loader',
        type: ['DelegationCredential'],
        delegationPolicyId: pharmacyIntegrationPolicy.id,
        delegationPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
        delegationRoleId: 'pharmacy',
        issuanceDate: PHARMACY_INTEGRATION_DATES_OK.issuanceDate,
        expirationDate: PHARMACY_INTEGRATION_DATES_OK.expirationDate,
        credentialSubject: pharmacySubjectPharmacy,
      },
    ];
    await expect(
      resolveAndVerifyDelegationPolicy({
        chain,
        rootPolicyId: pharmacyIntegrationPolicy.id,
        rootPolicyDigest: PHARMACY_INTEGRATION_DIGEST,
        documentLoader: undefined,
      }),
    ).rejects.toMatchObject({ code: DelegationErrorCodes.POLICY_DOCUMENT_LOADER_REQUIRED });
  });
});
