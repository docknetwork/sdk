import jsonld from 'jsonld';
import { randomAsHex } from '../src/utils';

import {
  acceptCompositeClaims,
  proveCompositeClaims,
  expandedLogicProperty,
  MAYCLAIM,
  ANYCLAIM,
  MAYCLAIM_DEF_1,
} from '../src/rdf-and-cd';

import { issueCredential } from '../src/vc';

import { createPresentation } from './utils/create-presentation';
import { documentLoader } from './utils/cached-document-loader';
import { newDid, verifyC, verifyP } from './utils/did-helpers';

function delegationCredential(delegator, delegate) {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: `urn:uuid:${randomAsHex(16)}`,
    type: ['VerifiableCredential', 'DelegationCredential'],
    issuer: delegator,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: delegate,
      [MAYCLAIM]: { '@id': ANYCLAIM },
    },
  };
}

describe('Credential delegation and redelegation (pharmacy -> doctor -> patient -> guardian)', () => {
  let doctor;
  let doctorKP;
  let pharmacy;
  let pharmacyKP;
  let patient;
  let patientKP;
  let guardian;
  let guardianKP;
  const CAN_PICK_UP = 'https://example.org/pharmacy#canPickUp';
  const CAN_PAY = 'https://example.org/pharmacy#canPay';
  const PRESCRIPTION = 'urn:rx:123456';
  let prescriptionCred;
  let pharmacyDelegatesToPatient;
  let patientDelegatesToGuardian;
  let guardianAssertion;
  let patientAssertion;

  beforeAll(async () => {
    ({ did: doctor, suite: doctorKP } = await newDid());
    ({ did: pharmacy, suite: pharmacyKP } = await newDid());
    ({ did: patient, suite: patientKP } = await newDid());
    ({ did: guardian, suite: guardianKP } = await newDid());

    prescriptionCred = await issueCredential(
      doctorKP,
      {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          {
            Prescription: 'https://example.org/pharmacy#Prescription',
            prescribes: 'https://example.org/pharmacy#prescribes',
            patient: 'https://schema.org/patient',
            medication: 'https://example.org/pharmacy#medication',
          },
        ],
        id: 'https://pharmacy.example/credentials/prescription-001',
        type: ['VerifiableCredential', 'Prescription'],
        issuer: doctor,
        issuanceDate: '2024-01-01T00:00:00Z',
        credentialSubject: {
          id: pharmacy,
          prescribes: {
            '@id': PRESCRIPTION,
          },
          patient: {
            '@id': patient,
          },
          medication: 'https://example.org/medication#Amoxicillin-500mg',
        },
      },
      true,
      documentLoader,
    );
    expect(await verifyC(prescriptionCred)).toHaveProperty('verified', true);

    pharmacyDelegatesToPatient = await issueCredential(
      pharmacyKP,
      delegationCredential(pharmacy, patient),
      true,
      documentLoader,
    );
    expect(await verifyC(pharmacyDelegatesToPatient)).toHaveProperty(
      'verified',
      true,
    );

    patientDelegatesToGuardian = await issueCredential(
      patientKP,
      delegationCredential(patient, guardian),
      true,
      documentLoader,
    );
    expect(await verifyC(patientDelegatesToGuardian)).toHaveProperty(
      'verified',
      true,
    );

    guardianAssertion = await issueCredential(
      guardianKP,
      {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://guardian.example/credentials/claim-001',
        type: ['VerifiableCredential', 'GuardianActionAuthorization'],
        issuer: guardian,
        issuanceDate: '2024-01-02T00:00:00Z',
        credentialSubject: {
          '@id': guardian,
          [CAN_PICK_UP]: { '@id': PRESCRIPTION },
          [CAN_PAY]: { '@id': PRESCRIPTION },
        },
      },
      true,
      documentLoader,
    );
    expect(await verifyC(guardianAssertion)).toHaveProperty('verified', true);

    patientAssertion = await issueCredential(
      patientKP,
      {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://patient.example/credentials/claim-001',
        type: ['VerifiableCredential', 'PatientActionAuthorization'],
        issuer: patient,
        issuanceDate: '2024-01-02T00:00:00Z',
        credentialSubject: {
          '@id': patient,
          [CAN_PICK_UP]: { '@id': PRESCRIPTION },
          [CAN_PAY]: { '@id': PRESCRIPTION },
        },
      },
      true,
      documentLoader,
    );
    expect(await verifyC(patientAssertion)).toHaveProperty('verified', true);
  });

  test(
    'guardian authorized to pick up and pay via redelegation chain',
    async () => {
      const presentation = createPresentation(
        [
          prescriptionCred,
          pharmacyDelegatesToPatient,
          patientDelegatesToGuardian,
          guardianAssertion,
        ],
        `urn:${randomAsHex(16)}`,
        guardian,
      );
      expect(await verifyP(presentation)).toHaveProperty('verified', true);

      const rules = [...MAYCLAIM_DEF_1];
      const compositeClaims = [
        [
          { Iri: guardian },
          { Iri: CAN_PICK_UP },
          { Iri: PRESCRIPTION },
          { Iri: pharmacy },
        ],
        [
          { Iri: guardian },
          { Iri: CAN_PAY },
          { Iri: PRESCRIPTION },
          { Iri: pharmacy },
        ],
      ];

      const expandedForProof = await jsonld.expand(presentation, { documentLoader });
      const proof = await proveCompositeClaims(expandedForProof, compositeClaims, rules);
      presentation[expandedLogicProperty] = proof;

      const expanded = await jsonld.expand(presentation, { documentLoader });
      const allClaims = await acceptCompositeClaims(expanded, rules);

      expect(allClaims).toContainEqual([
        { Iri: guardian },
        { Iri: CAN_PICK_UP },
        { Iri: PRESCRIPTION },
        { Iri: pharmacy },
      ]);
      expect(allClaims).toContainEqual([
        { Iri: guardian },
        { Iri: CAN_PAY },
        { Iri: PRESCRIPTION },
        { Iri: pharmacy },
      ]);

      expect(allClaims).toContainEqual([
        { Iri: guardian },
        { Iri: CAN_PICK_UP },
        { Iri: PRESCRIPTION },
        { Iri: guardian },
      ]);
      expect(allClaims).toContainEqual([
        { Iri: guardian },
        { Iri: CAN_PAY },
        { Iri: PRESCRIPTION },
        { Iri: guardian },
      ]);
    },
    30000,
  );

  test(
    'patient authorized to pick up and pay via delegation chain',
    async () => {
      const presentation = createPresentation(
        [
          prescriptionCred,
          pharmacyDelegatesToPatient,
          patientAssertion,
        ],
        `urn:${randomAsHex(16)}`,
        patient,
      );
      expect(await verifyP(presentation)).toHaveProperty('verified', true);

      const rules = [...MAYCLAIM_DEF_1];
      const compositeClaims = [
        [
          { Iri: patient },
          { Iri: CAN_PICK_UP },
          { Iri: PRESCRIPTION },
          { Iri: pharmacy },
        ],
        [
          { Iri: patient },
          { Iri: CAN_PAY },
          { Iri: PRESCRIPTION },
          { Iri: pharmacy },
        ],
      ];

      const expandedForProof = await jsonld.expand(presentation, { documentLoader });
      const proof = await proveCompositeClaims(expandedForProof, compositeClaims, rules);
      presentation[expandedLogicProperty] = proof;

      const expanded = await jsonld.expand(presentation, { documentLoader });
      const allClaims = await acceptCompositeClaims(expanded, rules);

      expect(allClaims).toContainEqual([
        { Iri: patient },
        { Iri: CAN_PICK_UP },
        { Iri: PRESCRIPTION },
        { Iri: pharmacy },
      ]);
      expect(allClaims).toContainEqual([
        { Iri: patient },
        { Iri: CAN_PAY },
        { Iri: PRESCRIPTION },
        { Iri: pharmacy },
      ]);

      expect(allClaims).toContainEqual([
        { Iri: patient },
        { Iri: CAN_PICK_UP },
        { Iri: PRESCRIPTION },
        { Iri: patient },
      ]);
      expect(allClaims).toContainEqual([
        { Iri: patient },
        { Iri: CAN_PAY },
        { Iri: PRESCRIPTION },
        { Iri: patient },
      ]);
    },
    30000,
  );
});
