import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import jsonld from 'jsonld';
import { verifyVPWithDelegation } from '../../src/engine.js';
import {
  VC_TYPE,
  VC_VC,
  SECURITY_PROOF,
  SECURITY_VERIFICATION_METHOD,
  VC_ISSUER,
  VC_SUBJECT,
  VC_TYPE_DELEGATION_CREDENTIAL,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
} from '../../src/constants.js';

const ROOT_CREDENTIAL_ID = 'urn:cred:root';
const LEAF_CREDENTIAL_ID = 'urn:cred:leaf';
const W3C_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const ISSUER_ROOT = 'did:root';
const SUBJECT_DELEGATE = 'did:delegate';
const SUBJECT_HOLDER = 'did:subject';
const CLAIM_NAME = 'creditScore';
const CLAIM_VALUE = 750;

vi.mock('jsonld', () => {
  const compact = vi.fn(async (node) => {
    if (node?.['@id'] === ROOT_CREDENTIAL_ID) {
      return {
        credentialSubject: {
          id: SUBJECT_DELEGATE,
          mayClaim: [CLAIM_NAME],
        },
      };
    }
    return {
      credentialSubject: {
        id: SUBJECT_HOLDER,
        creditScore: CLAIM_VALUE,
      },
    };
  });
  return {
    default: { compact },
    compact,
  };
});

vi.mock('rify', () => ({
  infer: vi.fn(() => []),
}));

describe('engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deny decision when expandedPresentation is missing', async () => {
    const result = await verifyVPWithDelegation({
      expandedPresentation: null,
      credentialContexts: new Map(),
    });
    expect(result.decision).toBe('deny');
    expect(result.failures).toHaveLength(1);
  });

  it('invokes jsonld compaction for every credential', async () => {
    const presentation = [
      {
        '@type': [VC_TYPE],
        [VC_VC]: [
          {
            '@graph': [
              {
                '@id': ROOT_CREDENTIAL_ID,
                '@type': [VC_TYPE_DELEGATION_CREDENTIAL],
                [VC_ISSUER]: [{ '@id': ISSUER_ROOT }],
                [VC_SUBJECT]: [{ '@id': SUBJECT_DELEGATE }],
                [VC_ROOT_CREDENTIAL_ID]: [{ '@id': ROOT_CREDENTIAL_ID }],
              },
            ],
          },
          {
            '@graph': [
              {
                '@id': LEAF_CREDENTIAL_ID,
                '@type': [VC_TYPE_DELEGATION_CREDENTIAL],
                [VC_ISSUER]: [{ '@id': SUBJECT_DELEGATE }],
                [VC_SUBJECT]: [{ '@id': SUBJECT_HOLDER }],
                [VC_ROOT_CREDENTIAL_ID]: [{ '@id': ROOT_CREDENTIAL_ID }],
                [VC_PREVIOUS_CREDENTIAL_ID]: [{ '@id': ROOT_CREDENTIAL_ID }],
              },
            ],
          },
        ],
        [SECURITY_PROOF]: [
          {
            [SECURITY_VERIFICATION_METHOD]: [{ '@id': `${ISSUER_ROOT}#key` }],
          },
        ],
      },
    ];

    const contexts = new Map([
      [ROOT_CREDENTIAL_ID, [W3C_CONTEXT]],
      [LEAF_CREDENTIAL_ID, [W3C_CONTEXT]],
    ]);

    const result = await verifyVPWithDelegation({
      expandedPresentation: presentation,
      credentialContexts: contexts,
    });
    expect(jsonld.compact).toHaveBeenCalledTimes(2);
    expect(result.decision).toBe('allow');
    expect(result.evaluations).toHaveLength(1);
  });
  it('fails when credential contexts are missing', async () => {
    const result = await verifyVPWithDelegation({
      expandedPresentation: buildPresentation(),
      credentialContexts: new Map(),
    });
    expect(result.decision).toBe('deny');
    expect(result.failures?.[0]?.code).toBeDefined();
  });

  it('supports documentLoader parameter for compaction', async () => {
    const loader = vi.fn(async (url) => ({ documentUrl: url, document: {} }));
    const contexts = new Map([[ROOT_CREDENTIAL_ID, [W3C_CONTEXT]]]);
    await verifyVPWithDelegation({
      expandedPresentation: buildPresentation(),
      credentialContexts: contexts,
      documentLoader: loader,
    });
    expect(loader).not.toHaveBeenCalled(); // no remote loads expected
  });
});

function buildPresentation() {
  return [
    {
      '@type': [VC_TYPE],
      [VC_VC]: [
        {
          '@graph': [
            {
              '@id': ROOT_CREDENTIAL_ID,
              '@type': [VC_TYPE_DELEGATION_CREDENTIAL],
              [VC_ISSUER]: [{ '@id': ISSUER_ROOT }],
              [VC_SUBJECT]: [{ '@id': SUBJECT_DELEGATE }],
              [VC_ROOT_CREDENTIAL_ID]: [{ '@id': ROOT_CREDENTIAL_ID }],
              [VC_PREVIOUS_CREDENTIAL_ID]: [{ '@id': ROOT_CREDENTIAL_ID }],
            },
          ],
        },
      ],
      [SECURITY_PROOF]: [
        {
          [SECURITY_VERIFICATION_METHOD]: [{ '@id': `${ISSUER_ROOT}#key` }],
        },
      ],
    },
  ];
}
