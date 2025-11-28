import { describe, it, expect } from 'vitest';

import { buildRifyRules, buildRifyPremisesFromChain } from '../../src/rify-helpers.js';

const ROOT_GRAPH = 'urn:root';
const AUTH_GRAPH = 'urn:authorized';
const DELEGATION_TYPE = 'DelegationCredential';
const MAY_CLAIM_IRI = 'https://rdf.dock.io/alpha/2021#mayClaim';
const CLAIM_NAME = 'creditScore';
const SUBJECT_DELEGATE = 'did:delegate';
const SUBJECT_HOLDER = 'did:subject';
const ISSUER_ROOT = 'did:issuer';

describe('rify-helpers', () => {
  it('builds inference rules referencing provided graphs', () => {
    const rules = buildRifyRules(ROOT_GRAPH, AUTH_GRAPH);
    expect(rules).toHaveLength(3);
    expect(JSON.stringify(rules)).toContain(ROOT_GRAPH);
    expect(JSON.stringify(rules)).toContain(AUTH_GRAPH);
  });

  it('builds premises from a simple delegation chain', () => {
    const chain = [
      {
        id: ROOT_GRAPH,
        issuer: ISSUER_ROOT,
        credentialSubject: {
          id: SUBJECT_DELEGATE,
          [MAY_CLAIM_IRI]: [CLAIM_NAME],
        },
        type: [DELEGATION_TYPE],
        rootCredentialId: ROOT_GRAPH,
      },
      {
        id: `${ROOT_GRAPH}#2`,
        issuer: SUBJECT_DELEGATE,
        credentialSubject: { id: SUBJECT_HOLDER, [CLAIM_NAME]: 750 },
        type: [DELEGATION_TYPE],
        previousCredentialId: ROOT_GRAPH,
        rootCredentialId: ROOT_GRAPH,
      },
    ];

    const premises = buildRifyPremisesFromChain(chain, ROOT_GRAPH);
    expect(premises).toEqual(
      expect.arrayContaining([
        [SUBJECT_DELEGATE, 'listsClaim', CLAIM_NAME, ROOT_GRAPH],
        [SUBJECT_DELEGATE, 'delegatesTo', SUBJECT_HOLDER, ROOT_GRAPH],
        [SUBJECT_HOLDER, CLAIM_NAME, '750', SUBJECT_DELEGATE],
      ]),
    );
  });

  it('supports JSONPath-based mayClaim entries for nested properties', () => {
    const chain = [
      {
        id: ROOT_GRAPH,
        issuer: ISSUER_ROOT,
        credentialSubject: {
          id: SUBJECT_DELEGATE,
          [MAY_CLAIM_IRI]: ['$.scope.spending.max'],
          scope: {
            spending: { max: 5000 },
          },
        },
        type: [DELEGATION_TYPE],
        rootCredentialId: ROOT_GRAPH,
      },
      {
        id: `${ROOT_GRAPH}#nested`,
        issuer: SUBJECT_DELEGATE,
        credentialSubject: {
          id: SUBJECT_HOLDER,
          scope: {
            spending: { max: 2000 },
          },
        },
        type: [DELEGATION_TYPE],
        previousCredentialId: ROOT_GRAPH,
        rootCredentialId: ROOT_GRAPH,
      },
    ];

    const premises = buildRifyPremisesFromChain(chain, ROOT_GRAPH);
    expect(premises).toEqual(
      expect.arrayContaining([
        [SUBJECT_DELEGATE, 'listsClaim', 'scope.spending.max', ROOT_GRAPH],
        [SUBJECT_HOLDER, 'scope.spending.max', '2000', SUBJECT_DELEGATE],
      ]),
    );
  });
});
