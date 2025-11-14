export const DelegationErrorCodes = {
  INVALID_PRESENTATION: 'INVALID_PRESENTATION',
  MISSING_CONTEXT: 'MISSING_CONTEXT',
  INVALID_CREDENTIAL: 'INVALID_CREDENTIAL',
  CHAIN_CYCLE: 'CHAIN_CYCLE',
  MISSING_CREDENTIAL: 'MISSING_CREDENTIAL',
  RIFY_FAILURE: 'RIFY_FAILURE',
  UNAUTHORIZED_CLAIM: 'UNAUTHORIZED_CLAIM',
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

