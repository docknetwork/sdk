import { describe, it, expect } from 'vitest';

import * as cedarAuthorization from '../../src/authorization/cedar/index.js';
import { buildCedarContext } from '../../src/authorization/cedar/context.js';
import { buildAuthorizationInputsFromEvaluation } from '../../src/authorization/cedar/authorization.js';

describe('authorization cedar index re-exports', () => {
  it('re-exports context helpers', () => {
    expect(cedarAuthorization.buildCedarContext).toBe(buildCedarContext);
    expect(cedarAuthorization.buildAuthorizationInputsFromEvaluation).toBe(buildAuthorizationInputsFromEvaluation);
  });
});
