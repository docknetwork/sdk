import { describe, it, expect } from 'vitest';

import { DelegationError, DelegationErrorCodes, normalizeDelegationFailure } from '../../src/errors.js';

describe('errors', () => {
  it('creates delegation errors with default code', () => {
    const err = new DelegationError(undefined, 'boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(DelegationErrorCodes.GENERAL);
    expect(err.message).toBe('boom');
  });

  it('normalizes failures with fallback info', () => {
    const normalized = normalizeDelegationFailure(null, { defaultCode: 'X' });
    expect(normalized).toEqual({ code: 'X', message: 'Unknown error' });

    const err = new DelegationError(DelegationErrorCodes.INVALID_PRESENTATION, 'bad');
    const result = normalizeDelegationFailure(err);
    expect(result.code).toBe(DelegationErrorCodes.INVALID_PRESENTATION);
    expect(result.message).toBe('bad');
  });
});
