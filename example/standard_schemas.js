/* eslint sonarjs/no-duplicate-string: 0 */
import Schema from '../src/modules/schema';
import { expandJSONLD } from '../src/utils/vc';
import { validateCredentialSchema } from '../src/utils/vc/schema';

import prCardSchema from './schemas/pr_card';
// import healthWorkerPassportSchema from './schemas/health_worker_passport';
import infectionDiagnosisSchema from './schemas/infection_diagnosis';
import immunityEventRecordSchema from './schemas/immunity_event_record';
import noInfectionSchema from './schemas/non_infection_check';

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
/*
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
}; */

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
  await validateCredentialSchema(expanded, schema, credential['@context']);
  console.log('Success!');
}

async function main() {
  await validateSchema(prCardSchema, credPRCard);

  // TODO Uncomment the line below. Commented because of a bug where json-ld serialization its turning an array of 1
  // object to an object, like fields `degreeHeld` and `licenses`. If I make them array of 2 items then checks pass
  // await validateSchema(healthWorkerPassportSchema, healthCareWorkerCred);

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
