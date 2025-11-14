import { describe, it, expect } from 'vitest';

import * as pkg from '../../src/index.js';
import { verifyVPWithDelegation } from '../../src/engine.js';
import { DelegationError } from '../../src/errors.js';

describe('package index exports', () => {
  it('re-exports verifyVPWithDelegation and errors', () => {
    expect(pkg.verifyVPWithDelegation).toBe(verifyVPWithDelegation);
    expect(pkg.DelegationError).toBe(DelegationError);
  });
});
