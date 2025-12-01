import { describe, it, expect } from 'vitest';

import * as cedarAuth from '../../src/cedar-auth.js';
import { buildCedarContext, runCedarAuthorization } from '../../src/authorization/cedar/context.js';

describe('cedar-auth entrypoint', () => {
  it('re-exports context helpers', () => {
    expect(cedarAuth.buildCedarContext).toBe(buildCedarContext);
    expect(cedarAuth.runCedarAuthorization).toBe(runCedarAuthorization);
  });
});
