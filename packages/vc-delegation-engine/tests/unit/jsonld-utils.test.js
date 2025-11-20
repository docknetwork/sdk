import { describe, it, expect } from 'vitest';

import {
  normalizeContextMap,
  shortenTerm,
  extractExpandedPresentationNode,
  extractExpandedVerificationMethod,
  findExpandedTermId,
  normalizeSubject,
  matchesType,
} from '../../src/jsonld-utils.js';
import { VC_TYPE, SECURITY_PROOF, SECURITY_VERIFICATION_METHOD } from '../../src/constants.js';

const SUBJECT_ID = 'did:test:subject';

describe('jsonld-utils', () => {
  it('normalizes context maps from plain objects', () => {
    const map = normalizeContextMap({ a: 1 });
    expect(map).toBeInstanceOf(Map);
    expect(map.get('a')).toBe(1);
  });

  it('shortens IRIs using hash or colon', () => {
    expect(shortenTerm('https://example.com#term')).toBe('term');
    expect(shortenTerm('urn:foo:bar')).toBe('bar');
  });

  it('extracts presentation node and verification method', () => {
    const presentation = [
      {
        '@type': [VC_TYPE],
        [SECURITY_PROOF]: [
          {
            [SECURITY_VERIFICATION_METHOD]: [{ '@id': 'did:example:abc#key' }],
          },
        ],
      },
    ];
    const node = extractExpandedPresentationNode(presentation);
    expect(node).toBe(presentation[0]);
    const vm = extractExpandedVerificationMethod(node, 'fallback');
    expect(vm).toBe('did:example:abc');
  });

  it('finds expanded term ids and normalizes subject values', () => {
    const node = {
      'https://ld.example/#rootCredentialId': [{ '@id': 'urn:root' }],
    };
    expect(findExpandedTermId(node, 'rootCredentialId')).toBe('urn:root');

    const subject = normalizeSubject({
      id: SUBJECT_ID,
      list: [{ '@value': 10 }],
      nested: { '@id': 'urn:value' },
    });
    expect(subject.nested).toBe('urn:value');
    expect(subject.list).toBe(10);
  });

  it('matches credential types regardless of array or string', () => {
    expect(matchesType({ type: ['X', 'Y'] }, 'X')).toBe(true);
    expect(matchesType({ type: 'Z' }, 'Z')).toBe(true);
  });
});
