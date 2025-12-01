import { describe, it, expect } from 'vitest';

import {
  buildAuthorizationInputsFromEvaluation,
  authorizeEvaluationsWithCedar,
} from '../../src/authorization/cedar/authorization.js';

const PRINCIPAL_ID = 'did:principal';
const RESOURCE_ID = 'Resource';

const evaluation = {
  summary: {
    rootTypes: ['Type'],
    tailTypes: ['Tail'],
    rootIssuerId: 'did:root',
    tailIssuerId: 'did:tail',
    tailDepth: 1,
  },
  facts: {
    principalId: PRINCIPAL_ID,
    presentationSigner: 'did:signer',
    resourceTypes: [RESOURCE_ID],
  },
  entities: [{ uid: { type: 'Credential::Actor', id: PRINCIPAL_ID }, attrs: {}, parents: [] }],
  authorizedClaims: { claim: true },
  authorizedClaimsBySubject: { [PRINCIPAL_ID]: { claim: true } },
};

describe('authorization/cedar/authorization', () => {
  it('builds authorization inputs from evaluation', () => {
    const inputs = buildAuthorizationInputsFromEvaluation({ evaluation });
    expect(inputs).toHaveLength(1);
    expect(inputs[0].principalId).toBe(PRINCIPAL_ID);
    expect(inputs[0].resourceId).toBe(RESOURCE_ID);
  });

  it('authorizes evaluations via cedar and stops on deny', () => {
    const cedar = {
      isAuthorized: () => ({
        type: 'success',
        response: { decision: 'deny' },
      }),
    };
    const result = authorizeEvaluationsWithCedar({
      cedar,
      evaluations: [evaluation],
      policies: 'policy',
    });
    expect(result.decision).toBe('deny');
    expect(result.authorizations).toHaveLength(1);
  });
});
