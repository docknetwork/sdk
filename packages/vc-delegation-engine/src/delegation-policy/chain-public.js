/**
 * Public API for delegation credential chain checks (re-export surface for `delegation-policy-chain.js`).
 */
export { durationToMilliseconds } from '../utils/duration.js';
export {
  coerceCapabilityValueForSchema,
  isDelegationCredentialType,
  assertDelegationPolicyRootPlacement,
  extractRootPolicyBinding,
  assertPolicyBindingsConsistentInChain,
} from './chain-types-binding.js';
export { assertMaxDelegationDepth } from './chain-depth.js';
export {
  isRoleAncestorOrEqual,
  isRoleStrictSubRole,
  assertChildCredentialExpiresBeforeOrEqualParent,
} from './chain-roles-lifetime.js';
export { subjectFieldDisclosureAllowedByRole } from './chain-subject-role.js';
export {
  assertAdjacentCredentialsMonotonic,
  assertChainCredentialMonotonicity,
} from './chain-monotonic.js';
export { verifyDelegationPolicyChain } from './chain-verify.js';
export { fetchDelegationPolicyJson, resolveAndVerifyDelegationPolicy } from './policy-resolve.js';
