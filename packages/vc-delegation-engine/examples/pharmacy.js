import { runScenario } from './helpers.js';
import {
  pharmacyPolicies,
  pharmacyPresentations,
} from '../tests/fixtures/pharmacy.js';

const policies = pharmacyPolicies;

await runScenario('GUARDIAN PRESENT', pharmacyPresentations.guardianAllowed, policies);

await runScenario('PATIENT PRESENT', pharmacyPresentations.patient, policies);

await runScenario(
  'GUARDIAN PRESENT NOT ALLOWED PICKUP',
  pharmacyPresentations.guardianDenied,
  policies,
);
