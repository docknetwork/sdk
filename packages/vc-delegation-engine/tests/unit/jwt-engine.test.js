import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import base64url from 'base64url';
import jsonld from 'jsonld';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';

import { verifyVPWithDelegation, authorizeEvaluationsWithCedar } from '../../src/index.js';
import {
  VC_TYPE,
  VC_VC,
  SECURITY_PROOF,
  SECURITY_VERIFICATION_METHOD,
  VC_ISSUER,
  VC_SUBJECT,
  VC_ROOT_CREDENTIAL_ID,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_TYPE_DELEGATION_CREDENTIAL,
  ACTION_VERIFY,
  UNKNOWN_IDENTIFIER,
} from '../../src/constants.js';
import { baseEntities } from '../../src/cedar-utils.js';

vi.mock('jsonld', () => {
  const expand = vi.fn(async (credential) => {
    const node = {
      '@id': credential.id,
      '@type': credential.type,
    };
    if (credential.issuer) {
      node[VC_ISSUER] = [{ '@id': credential.issuer }];
    }
    if (credential.rootCredentialId) {
      node[VC_ROOT_CREDENTIAL_ID] = [{ '@id': credential.rootCredentialId }];
    }
    if (credential.previousCredentialId) {
      node[VC_PREVIOUS_CREDENTIAL_ID] = [{ '@id': credential.previousCredentialId }];
    }
    if (credential.credentialSubject?.id) {
      node[VC_SUBJECT] = [{ '@id': credential.credentialSubject.id }];
    }
    return [node];
  });
  const compact = vi.fn(async (node) => ({
    credentialSubject: {
      id: `subject:${node['@id'] ?? 'unknown'}`,
      creditScore: 715,
      mayClaim: ['creditScore'],
    },
  }));
  return {
    default: { expand, compact },
    expand,
    compact,
  };
});

vi.mock('rify', () => ({
  infer: vi.fn(() => []),
}));

const W3C_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const PRESENTATION_SIGNER = 'did:example:signer';

describe('VC-JWT handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('summarizes JSON-LD VC-JWT credentials', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-jsonld',
      context: [W3C_CONTEXT],
      type: ['VerifiableCredential', 'ScoreCredential'],
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(result.decision).toBe('allow');
    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0].resourceId).toBe('urn:cred:jwt-jsonld');
    expect(result.skippedCredentialIds).toEqual([]);
    expect(jsonld.expand).toHaveBeenCalled();
  });

  it('skips VC-JWT credentials that lack JSON-LD context', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-no-context',
      context: null,
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(result.decision).toBe('allow');
    expect(result.summaries).toHaveLength(0);
    expect(result.skippedCredentialIds).toEqual(['urn:cred:jwt-no-context']);
    expect(result.skippedCredentials).toHaveLength(1);
    expect(result.skippedCredentials[0].claims.creditScore).toBe(715);
    expect(jsonld.expand).not.toHaveBeenCalled();
  });

  it('processes mixtures of delegation credentials and skipped VC-JWTs', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-skipped',
      context: undefined,
    });
    const rootCredentialId = 'urn:cred:deleg-root';
    const presentation = buildExpandedPresentation([
      {
        '@graph': [
          {
            '@id': rootCredentialId,
            '@type': [VC_TYPE_DELEGATION_CREDENTIAL],
            [VC_ISSUER]: [{ '@id': 'did:example:authority' }],
            [VC_SUBJECT]: [{ '@id': 'did:example:delegate' }],
            [VC_ROOT_CREDENTIAL_ID]: [{ '@id': rootCredentialId }],
          },
        ],
      },
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const contexts = new Map([[rootCredentialId, [W3C_CONTEXT]]]);
    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: contexts,
    });

    expect(result.decision).toBe('allow');
    expect(result.summaries.some((summary) => summary.resourceId === rootCredentialId)).toBe(true);
    expect(result.skippedCredentialIds).toEqual(['urn:cred:jwt-skipped']);
    expect(result.skippedCredentials).toHaveLength(1);
  });

  it('skips non-JSON-LD VC-JWTs but exposes claims for policy evaluation', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-non-jsonld',
      context: null,
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(result.decision).toBe('allow');
    expect(result.summaries).toHaveLength(0);
    expect(result.skippedCredentialIds).toEqual(['urn:cred:jwt-non-jsonld']);
    expect(result.skippedCredentials).toHaveLength(1);
    const skipped = result.skippedCredentials[0];
    expect(skipped.claims.creditScore).toBe(715);
    // Simulate a policy check that enforces a minimum credit score
    const mockPolicyResult = skipped.claims.creditScore >= 700;
    expect(mockPolicyResult).toBe(true);
  });

  it('allows Cedar policies to validate skipped VC-JWT claims', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-policy',
      context: null,
      type: ['VerifiableCredential', 'ScoreCredential'],
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const verification = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    const skipped = verification.skippedCredentials?.[0];
    expect(skipped).toBeDefined();

    const evaluation = buildEvaluationFromSkippedCredential(skipped, PRESENTATION_SIGNER);

    const allowPolicies = {
      staticPolicies: `
        permit(
          principal,
          action == Credential::Action::"Verify",
          resource == Credential::Object::"ScoreCredential"
        ) when { context.authorizedClaims.creditScore >= 700 };
      `,
    };

    const allowResult = authorizeEvaluationsWithCedar({
      cedar,
      evaluations: [evaluation],
      policies: allowPolicies,
    });
    expect(allowResult.decision).toBe('allow');

    const denyPolicies = {
      staticPolicies: `
        permit(
          principal,
          action == Credential::Action::"Verify",
          resource == Credential::Object::"ScoreCredential"
        ) when { context.authorizedClaims.creditScore >= 750 };
      `,
    };
    const denyResult = authorizeEvaluationsWithCedar({
      cedar,
      evaluations: [evaluation],
      policies: denyPolicies,
    });
    expect(denyResult.decision).toBe('deny');
  });

  it('authorizes mixed JSON-LD and skipped VC-JWTs via Cedar', async () => {
    const delegableJwt = buildJwt({
      id: 'urn:cred:jwt-mixed-jsonld',
      context: [W3C_CONTEXT],
      type: ['VerifiableCredential', 'ScoreCredential'],
    });
    const skippedJwt = buildJwt({
      id: 'urn:cred:jwt-mixed-skipped',
      context: null,
      type: ['VerifiableCredential', 'BonusCredential'],
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': delegableJwt }] },
      { '@graph': [{ '@id': skippedJwt }] },
    ]);

    const verification = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(verification.summaries).toHaveLength(1);
    expect(verification.skippedCredentials).toHaveLength(1);

    const skippedEvaluation = buildEvaluationFromSkippedCredential(
      verification.skippedCredentials[0],
      PRESENTATION_SIGNER,
    );

    const policies = {
      staticPolicies: `
        permit(
          principal,
          action == Credential::Action::"Verify",
          resource == Credential::Object::"ScoreCredential"
        );

        permit(
          principal,
          action == Credential::Action::"Verify",
          resource == Credential::Object::"BonusCredential"
        );
      `,
    };

    const result = authorizeEvaluationsWithCedar({
      cedar,
      evaluations: [...verification.evaluations, skippedEvaluation],
      policies,
    });
    expect(result.decision).toBe('allow');
    expect(result.authorizations).toHaveLength(2);
  });

  it('preserves multi-subject claims for skipped VC-JWTs', async () => {
    const multiSubjects = [
      { id: 'did:example:sub-1', creditScore: 720 },
      { id: 'did:example:sub-2', creditScore: 690 },
    ];
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-multi-subject',
      context: null,
      credentialSubject: multiSubjects,
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    const skipped = result.skippedCredentials?.[0];
    expect(skipped).toBeDefined();
    expect(skipped.claims).toEqual(multiSubjects);
  });

  it('denies JSON-LD VC-JWT when failOnUnauthorizedClaims is enabled', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-unauthorized',
      context: [W3C_CONTEXT],
      type: ['VerifiableCredential', 'ScoreCredential'],
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
      failOnUnauthorizedClaims: true,
    });

    expect(result.decision).toBe('deny');
    expect(result.failures?.[0]?.code).toBe('UNAUTHORIZED_CLAIM');
  });

  it('errors when delegation credential context mapping is missing', async () => {
    const credentialId = 'urn:cred:missing-context';
    const presentation = buildExpandedPresentation([
      {
        '@graph': [
          {
            '@id': credentialId,
            '@type': [VC_TYPE_DELEGATION_CREDENTIAL],
            [VC_ISSUER]: [{ '@id': 'did:example:authority' }],
            [VC_SUBJECT]: [{ '@id': 'did:example:delegate' }],
            [VC_ROOT_CREDENTIAL_ID]: [{ '@id': credentialId }],
          },
        ],
      },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(result.decision).toBe('deny');
    expect(result.failures?.[0]?.code).toBe('MISSING_CONTEXT');
  });

  it('does not error when skipped VC-JWT lacks a context mapping', async () => {
    const jwtCredential = buildJwt({
      id: 'urn:cred:jwt-no-context-map',
      context: null,
    });
    const presentation = buildExpandedPresentation([
      { '@graph': [{ '@id': jwtCredential }] },
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: new Map(),
    });

    expect(result.decision).toBe('allow');
    expect(result.skippedCredentialIds).toEqual(['urn:cred:jwt-no-context-map']);
  });
});

function buildExpandedPresentation(vcEntries) {
  return [
    {
      '@type': [VC_TYPE],
      [VC_VC]: vcEntries,
      [SECURITY_PROOF]: [
        {
          '@graph': [
            {
              [SECURITY_VERIFICATION_METHOD]: [
                { '@id': `${PRESENTATION_SIGNER}#key` },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function buildJwt({
  id,
  context,
  type = ['VerifiableCredential'],
  issuer = 'did:example:issuer',
  subjectId = 'did:example:subject',
  credentialSubject,
}) {
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: `${issuer}#key`,
  };
  const payload = {
    jti: id,
    iss: issuer,
    sub: subjectId,
    vc: {
      id,
      type,
      issuer,
      credentialSubject: credentialSubject ?? { id: subjectId, creditScore: 715 },
    },
  };
  if (Array.isArray(context) ? context.length > 0 : Boolean(context)) {
    payload.vc['@context'] = context;
  }
  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedPayload = base64url.encode(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.signature`;
}

function buildEvaluationFromSkippedCredential(skipped = {}, principalId = UNKNOWN_IDENTIFIER) {
  const resourceTypes = (skipped.types ?? []).filter(
    (type) => type && type !== 'VerifiableCredential',
  );
  const claims = skipped.claims ?? {};
  const authorizedClaimsBySubject = {
    [skipped.subjectId ?? UNKNOWN_IDENTIFIER]: claims,
  };
  const summary = {
    resourceId: skipped.credentialId ?? 'urn:skipped',
    delegations: [],
    rootTypes: resourceTypes,
    tailTypes: resourceTypes,
    rootIssuerId: skipped.issuerId ?? UNKNOWN_IDENTIFIER,
    tailIssuerId: skipped.issuerId ?? UNKNOWN_IDENTIFIER,
    tailDepth: 0,
    authorizedClaims: claims,
    authorizedClaimsBySubject,
    resourceTypes,
  };
  const facts = {
    ...summary,
    actionIds: [ACTION_VERIFY],
    principalId,
    presentationSigner: principalId,
  };
  const entities = baseEntities([skipped.issuerId ?? UNKNOWN_IDENTIFIER, principalId]);
  return {
    summary,
    facts,
    entities,
    chain: [],
    premises: [],
    derived: [],
    authorizedClaims: claims,
    authorizedClaimsBySubject,
    resourceTypes,
  };
}
