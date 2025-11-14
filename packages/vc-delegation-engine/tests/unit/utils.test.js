import { describe, it, expect } from 'vitest';

import { firstArrayItem, toArray, extractMayClaims } from '../../src/utils.js';

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

  it('returns empty array for invalid subjects', () => {
    expect(extractMayClaims(null)).toEqual([]);
    expect(extractMayClaims('bad')).toEqual([]);
  });
});
