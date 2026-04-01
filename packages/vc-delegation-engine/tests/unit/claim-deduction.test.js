import { describe, it, expect } from 'vitest';

import { collectAuthorizedClaims } from '../../src/claim-deduction.js';

const SUBJECT_A = 'did:test:a';
const SUBJECT_B = 'did:test:b';
const AUTHORIZED_GRAPH = 'urn:authorized:root';

describe('claim-deduction', () => {
  it('aggregates authorized claims per subject and union', () => {
    const chain = [
      {
        credentialSubject: {
          id: SUBJECT_A,
          name: 'Issuer',
        },
      },
      {
        credentialSubject: {
          id: SUBJECT_B,
          score: 750,
        },
      },
    ];
    const derivedFacts = [
      [SUBJECT_A, 'name', 'Issuer', AUTHORIZED_GRAPH],
      [SUBJECT_B, 'score', 750, AUTHORIZED_GRAPH],
    ];

    const { perSubject, union } = collectAuthorizedClaims(chain, derivedFacts, AUTHORIZED_GRAPH, chain);
    expect(perSubject[SUBJECT_A]).toEqual({ name: 'Issuer' });
    expect(perSubject[SUBJECT_B]).toEqual({ score: 750 });
    expect(union).toMatchObject({ score: 750, name: 'Issuer' });
  });

  it('ignores control predicates and handles missing data', () => {
    const chain = [
      {
        credentialSubject: {
          id: SUBJECT_A,
        },
      },
    ];
    const derivedFacts = [
      [SUBJECT_A, 'delegatesTo', 'did:other', AUTHORIZED_GRAPH], // should be ignored
      [SUBJECT_A, 'score', undefined, AUTHORIZED_GRAPH],
    ];

    const { perSubject, union } = collectAuthorizedClaims(chain, derivedFacts, AUTHORIZED_GRAPH, chain);
    expect(perSubject[SUBJECT_A]).toEqual({ delegatesTo: 'did:other' });
    expect(union).toEqual({ delegatesTo: 'did:other' });
  });
});
