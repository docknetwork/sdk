import Schema from '../src/modules/schema';
import { validateCredentialSchema, expandJSONLD } from '../src/utils/vc';

import bolSchema from '../src/utils/vc/schemas/bol';
import prCardSchema from '../src/utils/vc/schemas/pr_card';
import qpInbonSchema from '../src/utils/vc/schemas/qp_inbond';
import healthWorkerPassportSchema from '../src/utils/vc/schemas/health_worker_passport';
import infectionDiagnosisSchema from '../src/utils/vc/schemas/infection_diagnosis';
import immunityEventRecordSchema from '../src/utils/vc/schemas/immunity_event_record';
import noInfectionSchema from '../src/utils/vc/schemas/non_infection_check';

// Schema from here https://github.com/w3c-ccg/vc-examples/blob/master/plugfest-2020/vendors/mavennet/credentials/BillOfLading.json
const bolCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://schema.org/',
    'https://mavennet.github.io/contexts/bill-of-lading-v1.0.jsonld',
  ],
  id: 'http://neo-flow.com/credentials/e94a16cb-35b2-4301-9fb6-7af3d8fe7b81',
  type: ['VerifiableCredential', 'BillOfLadingCredential'],
  name: 'Bill of Lading',
  description: 'Detailed shipment document provided by the carrier to the receiver of products.',
  issuer: 'did:v1:test:nym:z6MkfG5HTrBXzsAP8AbayNpG3ZaoyM4PCqNPrdWQRSpHDV6J',
  issuanceDate: '2020-04-09T21:13:13Z',
  credentialSubject: {
    productIdentifier: '3a185b8f-078a-4646-8343-76a45c2856a5',
    bolNumber: 'BOL000104976',
    carrier: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
    recipient: 'did:v1:test:nym:z6MknQLHcwKwopce5ji1Ftsurn8mNL58wTxZB238uEMsegUj',
    transportType: 'Pipeline',
    originAddress: {
      address: 'Quebec, CAN',
      latitude: 52.9399,
      longitude: 73.5491,
    },
    deliveryAddress: {
      address: 'Chicago, USA',
      latitude: 41.8781,
      longitude: 87.6298,
    },
    valuePerItem: 46,
    totalOrderValue: 126500,
    freightChargeTerms: 'Freight Prepaid',
    expectedDeliveryDates: '2020-04-12',
    comments: '',
  },
};

// Schema from here https://github.com/w3c-ccg/vc-examples/blob/master/plugfest-2020/vendors/sicpa/credentials/PermanentResidentCard.json
const credPRCard = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/citizenship/v1',
  ],
  type: [
    'VerifiableCredential',
    'PermanentResidentCard',
  ],
  credentialSubject: {
    id: 'did:key:z6Mkte9e5E2GRozAgYyhktX7eTt9woCR4yJLnaqC88FQCSyY',
    type: [
      'PermanentResident',
      'Person',
    ],
    givenName: 'JOHN',
    familyName: 'SMITH',
    gender: 'Male',
    image: 'data:image/png;base64,iVBORw0KGgo...kJggg==',
    residentSince: '2015-01-01',
    lprCategory: 'C09',
    lprNumber: '000-000-204',
    commuterClassification: 'C1',
    birthCountry: 'Bahamas',
    birthDate: '1958-08-17',
  },
  issuer: 'did:sov:staging:PiEVD2uU2qKEQ5oxx1BJ6A',
  issuanceDate: '2020-04-22T10:37:22Z',
  identifier: '83627465',
  name: 'Permanent Resident Card',
  description: 'Government of Example Permanent Resident Card.',
};

const qPInbondCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://schema.org/',
    'https://mavennet.github.io/contexts/qp-in-bond-v1.0.jsonld',
  ],
  id: 'http://neo-flow.com/credentials/3aee17e7-8c50-4551-a8b4-9bc129c106e8',
  type: ['VerifiableCredential', 'QPInbondCredential'],
  name: 'QP Inbond',
  description: 'Permit document for import/export of shipments that have not been cleared by US Customs.',
  issuer: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
  issuanceDate: '2020-04-09T21:13:43Z',
  credentialSubject: {
    productIdentifier: '3a185b8f-078a-4646-8343-76a45c2856a5',
    inBondNumber: '123456789',
    inBondType: 'IT (61)',
    portOfEntry: 'Superior, WI, USA',
    carrier: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
    irsNumber: '12345678-01',
    transportType: 'Pipeline',
    recipient: 'did:v1:test:nym:z6MknQLHcwKwopce5ji1Ftsurn8mNL58wTxZB238uEMsegUj',
    originAddress: {
      address: 'Quebec, CAN',
      latitude: 52.9399,
      longitude: 73.5491,
    },
    deliveryAddress: {
      address: 'Chicago, USA',
      latitude: 41.8781,
      longitude: 87.6298,
    },
    bolNumber: 'BOL000104976',
    valuePerItem: 46,
    totalOrderValue: 126500,
    expectedDeliveryDates: '2020-04-12',
    comment: 'None',
  },
};

// Schema from here https://docs.google.com/document/d/1F5TLvAqCxj1kaPuPe6JhdECixwpbhKpEAb8eeQuDGT4/edit#heading=h.kdkhzpmqto5s
const healthCareWorkerCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    'https://schema.org/',
  ],
  id: 'https://example.com/credentials/1872',
  type: ['VerifiableCredential', 'HealthCareWorkerPassportCredential'],
  issuer: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
  issuanceDate: '2020-04-09T21:13:43Z',
  credentialSubject: {
    firstName: 'John',
    lastName: 'Smith',
    photo: 'https://example.com/photos/102',
    biometricTemplate: {
      fingerprint: 'c2856a76a785b8fa185a45c',
      retina: '8fa185a45cc2856a76a785b',
    },
    degreeHeld: [
      {
        institution: 'Albany Medical College',
        degree: 'MD',
      },
    ],
    licenses: [
      {
        licenseName: 'Medical License',
        licenser: 'New York',
        licensedFor: 'USA',
        expiresDate: '2020-11-25',
      },
    ],
  },
};

// Schema from here https://docs.google.com/document/d/1F5TLvAqCxj1kaPuPe6JhdECixwpbhKpEAb8eeQuDGT4/edit#heading=h.ppf3i61y3kbc
const infectionDiagnosisCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    'https://schema.org/',
  ],
  id: 'https://example.com/credentials/1872',
  type: ['VerifiableCredential', 'InfectionDiagnosisCredential'],
  issuer: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
  issuanceDate: '2020-04-09T21:13:43Z',
  credentialSubject: {
    firstName: 'John',
    firstInitial: 'J',
    lastName: 'Smith',
    lastInitial: 'S',
    yearOfBirth: 1990,
    photo: 'https://example.com/photos/102',
    biometricTemplate: {
      fingerprint: 'c2856a76a785b8fa185a45c',
      retina: '8fa185a45cc2856a76a785b',
    },
    diagnosisCode: 'CodeA',
    diagnosisTime: '2020-02-13T20:20:39+00:00',
    diagnosisLocation: 'New York City, New York, USA',
    diagnosedBy: 'Anne Lyons, MD',
    diagnosisFacility: 'Cedar Sinai Memorial Hospital',
    diagnosisMethods: ['personal interview and observation', 'rRT-PCR'],
    declaredSafeDate: '2020-03-15',
  },
};

// Schema from here https://docs.google.com/document/d/1F5TLvAqCxj1kaPuPe6JhdECixwpbhKpEAb8eeQuDGT4/edit#heading=h.uuhsd64qh6k2
const immunityEventRecordCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    'https://schema.org/',
  ],
  id: 'https://example.com/credentials/1872',
  type: ['VerifiableCredential', 'ImmunityEventRecordCredential'],
  issuer: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
  issuanceDate: '2020-04-09T21:13:43Z',
  credentialSubject: {
    firstName: 'John',
    firstInitial: 'J',
    lastName: 'Smith',
    lastInitial: 'S',
    yearOfBirth: 1990,
    photo: 'https://example.com/photos/102',
    biometricTemplate: {
      fingerprint: 'c2856a76a785b8fa185a45c',
      retina: '8fa185a45cc2856a76a785b',
    },
    eventType: 'vaccination',
    eventTime: '2020-02-13T20:20:39+00:00',
    eventBy: 'Anne Lyons, MD',
    eventFacility: 'Cedar Sinai Memorial Hospital',
    eventName: 'X-trans-23 vaccine',
    potencyDate: '2020-03-15',
  },
};

// Schema from here https://docs.google.com/document/d/1F5TLvAqCxj1kaPuPe6JhdECixwpbhKpEAb8eeQuDGT4/edit#heading=h.ketv4b5njsr6
const noInfectionCred = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    'https://schema.org/',
  ],
  id: 'https://example.com/credentials/1872',
  type: ['VerifiableCredential', 'NoInfectionCredential'],
  issuer: 'did:v1:test:nym:z6MkhdmzFu659ZJ4XKj31vtEDmjvsi5yDZG5L7Caz63oP39k',
  issuanceDate: '2020-04-09T21:13:43Z',
  credentialSubject: {
    firstName: 'John',
    firstInitial: 'J',
    lastName: 'Smith',
    lastInitial: 'S',
    yearOfBirth: 1990,
    photo: 'https://example.com/photos/102',
    biometricTemplate: {
      fingerprint: 'c2856a76a785b8fa185a45c',
      retina: '8fa185a45cc2856a76a785b',
    },
    virus: ['Covid-19', 'Covid-3'],
    checkTime: '2020-02-13T20:20:39+00:00',
    checkLocation: 'New York City, New York, USA',
    checkedBy: 'Anne Lyons, MD',
    checkFacility: 'Cedar Sinai Memorial Hospital',
    diagnosisMethods: ['personal interview and observation', 'rRT-PCR'],
  },
};

async function validateSchema(schema, credential) {
  console.log('Validating schema:', schema.description);
  await Schema.validateSchema(schema);
  console.log('Validating credential against schema...');

  const expanded = await expandJSONLD(credential);
  validateCredentialSchema(expanded, schema, credential['@context']);
  console.log('Success!');
}

async function main() {
  await validateSchema(bolSchema, bolCred);
  await validateSchema(prCardSchema, credPRCard);
  await validateSchema(qpInbonSchema, qPInbondCred);
  await validateSchema(healthWorkerPassportSchema, healthCareWorkerCred);

  await validateSchema(infectionDiagnosisSchema, infectionDiagnosisCred);
  await validateSchema(immunityEventRecordSchema, immunityEventRecordCred);
  await validateSchema(noInfectionSchema, noInfectionCred);

  // All done
  console.log('All schemas validated.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error occurred somewhere, it was caught!', error);
  process.exit(1);
});
