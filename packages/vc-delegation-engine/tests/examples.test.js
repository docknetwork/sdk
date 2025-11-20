import { describe, it, expect } from 'vitest';
import jsonld from 'jsonld';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';

import { verifyVPWithDelegation, authorizeEvaluationsWithCedar } from '../src/index.js';
import documentLoader from '../examples/document-loader.js';
import {
  nonDelegatedPolicies,
  nonDelegatedPresentation,
} from './fixtures/nonDelegated.js';
import {
  simpleDelegationPolicies,
  simpleDelegationPresentations,
} from './fixtures/simpleDelegation.js';
import {
  pharmacyPolicies,
  pharmacyPresentations,
} from './fixtures/pharmacy.js';
import {
  multiDelegationPolicies,
  multiDelegationPresentation,
} from './fixtures/multiDelegation.js';
import {
  staffPolicies,
  staffPresentations,
} from './fixtures/staff.js';

async function verifyPresentation(presentation) {
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

async function verifyAndAuthorize(presentation, policies) {
  const verification = await verifyPresentation(presentation);
  if (!policies) {
    return { verification, authorization: { decision: verification.decision, authorizations: [] } };
  }
  const authorization = authorizeEvaluationsWithCedar({
    cedar,
    evaluations: verification.evaluations,
    policies,
  });
  return { verification, authorization };
}

describe('delegation engine examples', () => {
  it('accepts non-delegated presentations', async () => {
    const { verification, authorization } = await verifyAndAuthorize(
      nonDelegatedPresentation,
      nonDelegatedPolicies,
    );
    if (verification.decision !== 'allow') {
      console.error('non-delegated verification failure', verification.failures);
    }
    expect(verification.decision).toBe('allow');
    expect(authorization.decision).toBe('allow');
  });

  it('handles authorized delegation chain', async () => {
    const { verification, authorization } = await verifyAndAuthorize(
      simpleDelegationPresentations.authorized,
      simpleDelegationPolicies,
    );
    if (verification.decision !== 'allow') {
      console.error('authorized delegation verification failure', verification.failures);
    }
    expect(verification.decision).toBe('allow');
    expect(authorization.decision).toBe('allow');
  });

  it('denies unauthorized delegation chain via policy', async () => {
    const { verification, authorization } = await verifyAndAuthorize(
      simpleDelegationPresentations.unauthorized,
      simpleDelegationPolicies,
    );
    if (verification.decision !== 'allow') {
      console.error('unauthorized delegation verification failure', verification.failures);
    }
    expect(verification.decision).toBe('allow');
    expect(authorization.decision).toBe('deny');
  });

  it('runs pharmacy scenario authorizations', async () => {
    const guardianResult = await verifyAndAuthorize(
      pharmacyPresentations.guardianAllowed,
      pharmacyPolicies,
    );
    if (guardianResult.verification.decision !== 'allow') {
      console.error('pharmacy guardian verification failure', guardianResult.verification.failures);
    }
    expect(guardianResult.authorization.decision).toBe('allow');

    const patientResult = await verifyAndAuthorize(
      pharmacyPresentations.patient,
      pharmacyPolicies,
    );
    if (patientResult.verification.decision !== 'allow') {
      console.error('pharmacy patient verification failure', patientResult.verification.failures);
    }
    expect(patientResult.authorization.decision).toBe('allow');

    const deniedResult = await verifyAndAuthorize(
      pharmacyPresentations.guardianDenied,
      pharmacyPolicies,
    );
    expect(deniedResult.authorization.decision).toBe('deny');
  });

  it('accepts multi-delegation presentation', async () => {
    const { verification, authorization } = await verifyAndAuthorize(
      multiDelegationPresentation,
      multiDelegationPolicies,
    );
    if (verification.decision !== 'allow') {
      console.error('multi delegation verification failure', verification.failures);
    }
    expect(verification.decision).toBe('allow');
    expect(authorization.decision).toBe('allow');
  });

  it('enforces staff delegation policy across parent hops', async () => {
    const validResult = await verifyAndAuthorize(
      staffPresentations.valid,
      staffPolicies,
    );
    if (validResult.verification.decision !== 'allow') {
      console.error('staff valid verification failure', validResult.verification.failures);
    }
    expect(validResult.verification.decision).toBe('allow');
    expect(validResult.authorization.decision).toBe('allow');

    const invalidResult = await verifyAndAuthorize(
      staffPresentations.invalid,
      staffPolicies,
    );
    if (invalidResult.verification.decision !== 'allow') {
      console.error('staff invalid verification failure', invalidResult.verification.failures);
    }
    expect(invalidResult.authorization.decision).toBe('deny');
  });
});
