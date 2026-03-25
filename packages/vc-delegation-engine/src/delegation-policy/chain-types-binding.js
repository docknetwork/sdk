import { DelegationError, DelegationErrorCodes } from '../errors.js';

/**
 * credentialSubject normalization may collapse single-element arrays to scalars; JSON Schema expects arrays.
 * @param {unknown} value
 * @param {object} schema
 * @returns {unknown}
 */
export function coerceCapabilityValueForSchema(value, schema) {
  if (schema?.type === 'array' && value != null && !Array.isArray(value)) {
    return [value];
  }
  return value;
}

/**
 * @param {object} vc
 * @returns {boolean}
 */
export function isDelegationCredentialType(vc) {
  return Array.isArray(vc?.type) && vc.type.includes('DelegationCredential');
}

/**
 * Ensures no credential has a partial policy binding; if any credential carries a policy, root must too.
 * @param {object[]} chain
 */
export function assertDelegationPolicyRootPlacement(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return;
  }
  let anyFullBinding = false;
  for (const vc of chain) {
    const hasId = typeof vc.delegationPolicyId === 'string' && vc.delegationPolicyId.length > 0;
    const hasDigest = typeof vc.delegationPolicyDigest === 'string' && vc.delegationPolicyDigest.length > 0;
    if (hasId !== hasDigest) {
      throw new DelegationError(
        DelegationErrorCodes.INVALID_CREDENTIAL,
        `Credential ${vc.id} must set both delegationPolicyId and delegationPolicyDigest or neither`,
      );
    }
    if (hasId) {
      anyFullBinding = true;
    }
  }
  if (!anyFullBinding) {
    return;
  }
  const root = chain[0];
  const rootOk = typeof root.delegationPolicyId === 'string' && root.delegationPolicyId.length > 0
    && typeof root.delegationPolicyDigest === 'string' && root.delegationPolicyDigest.length > 0;
  if (!rootOk) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'When any credential references a delegation policy, the root credential must include delegationPolicyId and delegationPolicyDigest',
    );
  }
}

/**
 * @param {object[]} chain Normalized credentials root..tail
 * @returns {{ hasPolicy: boolean, rootPolicyId?: string, rootPolicyDigest?: string }}
 */
export function extractRootPolicyBinding(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return { hasPolicy: false };
  }
  const root = chain[0];
  const id = root.delegationPolicyId;
  const digest = root.delegationPolicyDigest;
  const hasId = typeof id === 'string' && id.length > 0;
  const hasDigest = typeof digest === 'string' && digest.length > 0;
  if (hasId !== hasDigest) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'delegationPolicyId and delegationPolicyDigest must both be set or both omitted on root credential',
    );
  }
  if (hasId) {
    return { hasPolicy: true, rootPolicyId: id, rootPolicyDigest: digest };
  }
  return { hasPolicy: false };
}

/**
 * @param {object[]} chain
 * @param {string} rootPolicyId
 * @param {string} rootPolicyDigest
 */
export function assertPolicyBindingsConsistentInChain(chain, rootPolicyId, rootPolicyDigest) {
  for (const vc of chain) {
    const id = vc.delegationPolicyId;
    const digest = vc.delegationPolicyDigest;
    const hasId = typeof id === 'string' && id.length > 0;
    const hasDigest = typeof digest === 'string' && digest.length > 0;
    if (hasId !== hasDigest) {
      throw new DelegationError(
        DelegationErrorCodes.INVALID_CREDENTIAL,
        `Credential ${vc.id} must set both delegationPolicyId and delegationPolicyDigest or neither`,
      );
    }
    if (hasId && id !== rootPolicyId) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_ID_MISMATCH,
        `Credential ${vc.id} delegationPolicyId must match root policy id`,
      );
    }
    if (hasDigest && digest !== rootPolicyDigest) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_DIGEST_MISMATCH,
        `Credential ${vc.id} delegationPolicyDigest must match root policy digest`,
      );
    }
  }
}
