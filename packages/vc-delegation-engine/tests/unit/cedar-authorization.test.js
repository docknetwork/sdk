import { describe, it, expect } from 'vitest';

import * as cedarAuthorization from '../../src/cedar-authorization.js';
import {
  authorizeEvaluationsWithCedar,
  buildAuthorizationInputsFromEvaluation,
} from '../../src/authorization/cedar/authorization.js';

describe('cedar-authorization entrypoint', () => {
  it('re-exports authorization helpers', () => {
    expect(cedarAuthorization.authorizeEvaluationsWithCedar).toBe(authorizeEvaluationsWithCedar);
    expect(cedarAuthorization.buildAuthorizationInputsFromEvaluation).toBe(buildAuthorizationInputsFromEvaluation);
  });
});
