import { describe, it, expect } from 'vitest';

import { buildCedarContext, runCedarAuthorization } from '../../src/authorization/cedar/context.js';

describe('authorization/cedar/context', () => {
  it('builds cedar context payloads with derived entities', () => {
    const request = buildCedarContext({
      principalId: 'did:principal',
      resourceId: 'urn:resource',
      vpSignerId: 'did:signer',
      tailDepth: 1,
    });
    expect(request.principal.id).toBe('did:principal');
    expect(request.resource.id).toBe('urn:resource');
    expect(request.context.vpSigner).toEqual({ __entity: { type: 'Credential::Actor', id: 'did:signer' } });
  });

  it('runs cedar authorization through provided module', () => {
    const decision = runCedarAuthorization({
      cedar: {
        isAuthorized: () => ({
          type: 'success',
          response: { decision: 'allow' },
        }),
      },
      policies: 'fake-policies',
      request: { test: true },
    });
    expect(decision).toBe('allow');
  });
});
