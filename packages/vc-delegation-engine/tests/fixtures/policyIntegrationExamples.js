import baseDocumentLoader from '../../examples/document-loader.js';
import pharmacyIntegrationPolicy from './policy-integration-pharmacy.json' with { type: 'json' };
import travelIntegrationPolicy from './policy-integration-travel.json' with { type: 'json' };
import { computePolicyDigestHex } from '../../src/delegation-policy-digest.js';

export { pharmacyIntegrationPolicy, travelIntegrationPolicy };

export const PHARMACY_INTEGRATION_DIGEST = computePolicyDigestHex(pharmacyIntegrationPolicy);
export const TRAVEL_INTEGRATION_DIGEST = computePolicyDigestHex(travelIntegrationPolicy);

const BASE_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
];

const PHARMACY_EX_CONTEXT = {
  '@version': 1.1,
  ex: 'https://example.org/credentials#',
  allowedClaims: 'ex:allowedClaims',
  prescriptionResourceIds: 'ex:prescriptionResourceIds',
  canPickUp: { '@id': 'ex:canPickUp', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
  canPay: { '@id': 'ex:canPay', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
  canCancel: { '@id': 'ex:canCancel', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' },
  PharmacyIntegrationRoot: 'ex:PharmacyIntegrationRoot',
  PharmacyIntegrationLeaf: 'ex:PharmacyIntegrationLeaf',
};

export const PHARMACY_INTEGRATION_CONTEXT = [
  ...BASE_DELEGATION_CONTEXT,
  PHARMACY_EX_CONTEXT,
];

const TRAVEL_EX_CONTEXT = {
  '@version': 1.1,
  tx: 'https://example.org/travel#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  allowedRoutes: 'tx:allowedRoutes',
  purchaseLimit: { '@id': 'tx:purchaseLimit', '@type': 'xsd:integer' },
  reserveFlights: { '@id': 'tx:reserveFlights', '@type': 'xsd:boolean' },
  reserveHotels: { '@id': 'tx:reserveHotels', '@type': 'xsd:boolean' },
  TravelAgencyCredential: 'tx:TravelAgencyCredential',
  TravelRegionalCredential: 'tx:TravelRegionalCredential',
  TravelAgentCredential: 'tx:TravelAgentCredential',
};

export const TRAVEL_INTEGRATION_CONTEXT = [
  ...BASE_DELEGATION_CONTEXT,
  TRAVEL_EX_CONTEXT,
];

export const PHARMACY_INTEGRATION_DATES_OK = {
  issuanceDate: '2026-03-20T12:00:00Z',
  expirationDate: '2026-06-10T12:00:00Z',
};

export const PHARMACY_INTEGRATION_DATES_CHILD_AFTER_PARENT = {
  issuanceDate: '2026-03-20T12:00:00Z',
  expirationDate: '2026-06-15T12:00:00Z',
};

export const TRAVEL_INTEGRATION_DATES_OK = {
  issuanceDate: '2026-01-10T00:00:00Z',
  expirationDate: '2027-01-05T00:00:00Z',
};

export const PRESENTATION_SHELL = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: 'urn:pres:policy-integration-example',
  type: ['VerifiablePresentation'],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2026-01-10T12:00:00Z',
    verificationMethod: 'did:test:holder#key',
    proofPurpose: 'authentication',
    challenge: 'policy-integration',
    domain: 'test',
    jws: 'test..test',
  },
};

/**
 * @param {object} options
 * @param {string} options.id
 * @param {string} options.issuer
 * @param {string} options.roleId
 * @param {object} options.credentialSubject
 * @param {string} [options.previousCredentialId]
 * @param {string} [options.rootCredentialId]
 * @param {string[]} [options.type]
 * @param {object} [options.dateFields]
 * @param {string} [options.delegationPolicyId]
 * @param {string} [options.delegationPolicyDigest]
 */
export function buildPharmacyIntegrationDelegationVc(options) {
  const {
    id,
    issuer,
    roleId,
    credentialSubject,
    previousCredentialId,
    rootCredentialId,
    type = ['VerifiableCredential', 'PharmacyIntegrationRoot', 'DelegationCredential'],
    dateFields = PHARMACY_INTEGRATION_DATES_OK,
    delegationPolicyId = pharmacyIntegrationPolicy.id,
    delegationPolicyDigest = PHARMACY_INTEGRATION_DIGEST,
  } = options;
  return {
    '@context': PHARMACY_INTEGRATION_CONTEXT,
    id,
    type,
    issuer,
    ...dateFields,
    rootCredentialId: rootCredentialId ?? id,
    previousCredentialId,
    delegationPolicyId,
    delegationPolicyDigest,
    delegationRoleId: roleId,
    credentialSubject,
  };
}

/**
 * @param {object} options
 * @param {string} options.id
 * @param {string} options.issuer
 * @param {object} options.credentialSubject
 * @param {string} options.previousCredentialId
 * @param {string} options.rootCredentialId
 * @param {object} [options.dateFields]
 */
export function buildPharmacyIntegrationLeafVc(options) {
  const {
    id,
    issuer,
    credentialSubject,
    previousCredentialId,
    rootCredentialId,
    dateFields = PHARMACY_INTEGRATION_DATES_OK,
  } = options;
  return {
    '@context': PHARMACY_INTEGRATION_CONTEXT,
    id,
    type: ['VerifiableCredential', 'PharmacyIntegrationLeaf'],
    issuer,
    ...dateFields,
    rootCredentialId,
    previousCredentialId,
    credentialSubject,
  };
}

/**
 * @param {object} options
 * @param {string} options.id
 * @param {string} options.issuer
 * @param {string} options.roleId
 * @param {object} options.credentialSubject
 * @param {string} [options.previousCredentialId]
 * @param {string} [options.rootCredentialId]
 * @param {string[]} [options.type]
 * @param {object} [options.dateFields]
 */
export function buildTravelIntegrationDelegationVc(options) {
  const {
    id,
    issuer,
    roleId,
    credentialSubject,
    previousCredentialId,
    rootCredentialId,
    type = ['VerifiableCredential', 'TravelAgencyCredential', 'DelegationCredential'],
    dateFields = TRAVEL_INTEGRATION_DATES_OK,
    delegationPolicyId = travelIntegrationPolicy.id,
    delegationPolicyDigest = TRAVEL_INTEGRATION_DIGEST,
  } = options;
  return {
    '@context': TRAVEL_INTEGRATION_CONTEXT,
    id,
    type,
    issuer,
    ...dateFields,
    rootCredentialId: rootCredentialId ?? id,
    previousCredentialId,
    delegationPolicyId,
    delegationPolicyDigest,
    delegationRoleId: roleId,
    credentialSubject,
  };
}

export function buildPolicyIntegrationPresentation(verifiableCredential) {
  return {
    ...PRESENTATION_SHELL,
    verifiableCredential,
  };
}

export function createPolicyIntegrationDocumentLoader() {
  const byId = {
    [pharmacyIntegrationPolicy.id]: pharmacyIntegrationPolicy,
    [travelIntegrationPolicy.id]: travelIntegrationPolicy,
  };
  return async (url) => {
    const hit = byId[url];
    if (hit) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: structuredClone(hit),
      };
    }
    return baseDocumentLoader(url);
  };
}

export const pharmacySubjectDoctor = {
  id: 'did:test:doctor',
  'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay', 'Cancel'],
  allowedClaims: ['PickUp', 'Pay', 'Cancel'],
  prescriptionResourceIds: ['urn:rx:101'],
  canPickUp: true,
  canPay: true,
  canCancel: true,
};

export const pharmacySubjectPharmacy = {
  id: 'did:test:pharmacy',
  'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp', 'Pay'],
  allowedClaims: ['PickUp', 'Pay'],
  prescriptionResourceIds: ['urn:rx:101'],
  canPickUp: true,
  canPay: true,
};

export const pharmacySubjectPatient = {
  id: 'did:test:patient',
  'https://rdf.dock.io/alpha/2021#mayClaim': ['PickUp'],
  allowedClaims: ['PickUp'],
  prescriptionResourceIds: ['urn:rx:101'],
  canPickUp: true,
};

export const pharmacySubjectLeaf = {
  id: 'did:test:leaf',
  allowedClaims: ['PickUp'],
  prescriptionResourceIds: ['urn:rx:101'],
  canPickUp: true,
};

export const travelSubjectAgency = {
  id: 'did:test:travel-agency',
  allowedRoutes: ['US-NYC-LAX', 'US-SFO-SEA', 'US-ORD-MIA'],
  purchaseLimit: 10000,
  reserveFlights: true,
  reserveHotels: true,
};

export const travelSubjectRegional = {
  id: 'did:test:regional',
  allowedRoutes: ['US-NYC-LAX', 'US-SFO-SEA', 'US-ORD-MIA'],
  purchaseLimit: 5000,
  reserveFlights: true,
};

export const travelSubjectAgent = {
  id: 'did:test:agent',
  allowedRoutes: ['US-NYC-LAX', 'US-SFO-SEA'],
  purchaseLimit: 1000,
  reserveFlights: true,
};
