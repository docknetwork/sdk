export const DelegationErrorCodes = {
  INVALID_PRESENTATION: 'INVALID_PRESENTATION',
  MISSING_CONTEXT: 'MISSING_CONTEXT',
  INVALID_CREDENTIAL: 'INVALID_CREDENTIAL',
  CHAIN_CYCLE: 'CHAIN_CYCLE',
  MISSING_CREDENTIAL: 'MISSING_CREDENTIAL',
  RIFY_FAILURE: 'RIFY_FAILURE',
  UNAUTHORIZED_CLAIM: 'UNAUTHORIZED_CLAIM',
  POLICY_DOCUMENT_LOADER_REQUIRED: 'POLICY_DOCUMENT_LOADER_REQUIRED',
  POLICY_DOCUMENT_LOAD_FAILED: 'POLICY_DOCUMENT_LOAD_FAILED',
  POLICY_DIGEST_MISMATCH: 'POLICY_DIGEST_MISMATCH',
  POLICY_ID_MISMATCH: 'POLICY_ID_MISMATCH',
  POLICY_SEMANTIC_INVALID: 'POLICY_SEMANTIC_INVALID',
  POLICY_ROLE_INVALID: 'POLICY_ROLE_INVALID',
  POLICY_DEPTH_EXCEEDED: 'POLICY_DEPTH_EXCEEDED',
  POLICY_CAPABILITY_INVALID: 'POLICY_CAPABILITY_INVALID',
  POLICY_LIFETIME_INVALID: 'POLICY_LIFETIME_INVALID',
  POLICY_MONOTONIC_VIOLATION: 'POLICY_MONOTONIC_VIOLATION',
  GENERAL: 'CHAIN_VALIDATION_ERROR',
};

export class DelegationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code ?? DelegationErrorCodes.GENERAL;
    this.name = 'DelegationError';
  }
}

export function normalizeDelegationFailure(error, { defaultCode = DelegationErrorCodes.GENERAL } = {}) {
  if (!error) {
    return { code: defaultCode, message: 'Unknown error' };
  }
  const code = error.code ?? defaultCode;
  return {
    code,
    message: error.message ?? String(error),
    stack: error.stack,
  };
}
