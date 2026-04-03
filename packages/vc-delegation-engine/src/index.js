export { verifyVPWithDelegation } from './engine.js';
export {
  authorizeEvaluationsWithCedar,
  buildAuthorizationInputsFromEvaluation,
  buildCedarContext,
  runCedarAuthorization,
} from './authorization/cedar/index.js';
export { DelegationError, DelegationErrorCodes } from './errors.js';
export {
  MAY_CLAIM_IRI,
  VC_DELEGATION_POLICY_ID,
  VC_DELEGATION_POLICY_DIGEST,
  VC_DELEGATION_ROLE_ID,
} from './constants.js';
export {
  canonicalPolicyJson,
  computePolicyDigestHex,
  verifyPolicyDigest,
} from './delegation-policy-digest.js';
export { validateDelegationPolicy } from './delegation-policy-validate.js';
export {
  assertDelegationPolicyRootPlacement,
  coerceCapabilityValueForSchema,
  durationToMilliseconds,
  fetchDelegationPolicyJson,
  resolveAndVerifyDelegationPolicy,
  verifyDelegationPolicyChain,
} from './delegation-policy-chain.js';
