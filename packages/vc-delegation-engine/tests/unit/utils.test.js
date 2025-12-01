import { describe, it, expect } from 'vitest';

import {
  firstArrayItem,
  toArray,
  extractMayClaims,
  collectSubjectClaimEntries,
} from '../../src/utils.js';

const SAMPLE_EMAIL = 'user@example.com';
const ACTION_READ = 'read';
const ACTION_WRITE = 'write';

describe('utils', () => {
  it('returns first array item or throws', () => {
    expect(firstArrayItem(['a', 'b'], 'missing')).toBe('a');
    expect(() => firstArrayItem([], 'boom')).toThrow('boom');
  });

  it('normalizes values to arrays', () => {
    expect(toArray(['x'])).toEqual(['x']);
    expect(toArray('x')).toEqual(['x']);
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });

  it('extracts mayClaim values while normalizing strings', () => {
    expect(extractMayClaims({ 'https://rdf.dock.io/alpha/2021#mayClaim': [1, 'two'] })).toEqual(['1', 'two']);
    expect(extractMayClaims({ mayClaim: 'creditScore' })).toEqual(['creditScore']);
    expect(extractMayClaims({})).toEqual([]);
  });

  it('expands JSONPath expressions in mayClaim arrays', () => {
    const subject = {
      mayClaim: ['$.finance.limits.max'],
      finance: {
        limits: {
          max: 9000,
        },
      },
    };
    expect(extractMayClaims(subject)).toEqual(['finance.limits.max']);
  });

  it('returns empty array for invalid subjects', () => {
    expect(extractMayClaims(null)).toEqual([]);
    expect(extractMayClaims('bad')).toEqual([]);
  });

  it('collects nested subject claim entries with path identifiers', () => {
    const subject = {
      id: 'did:root',
      profile: {
        contact: {
          email: SAMPLE_EMAIL,
        },
      },
      permissions: [
        { action: ACTION_READ },
        { action: ACTION_WRITE },
      ],
    };
    const entries = collectSubjectClaimEntries(subject);
    expect(entries).toEqual(
      expect.arrayContaining([
        ['profile', { contact: { email: SAMPLE_EMAIL } }],
        ['profile.contact', { email: SAMPLE_EMAIL }],
        ['profile.contact.email', SAMPLE_EMAIL],
        ['permissions', subject.permissions],
        ['permissions[0]', { action: 'read' }],
        ['permissions[0].action', ACTION_READ],
        ['permissions[1].action', ACTION_WRITE],
      ]),
    );
  });
});
