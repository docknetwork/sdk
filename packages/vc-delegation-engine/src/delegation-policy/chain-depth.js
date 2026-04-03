import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { isDelegationCredentialType } from './chain-types-binding.js';

/**
 * Onward delegation steps = delegation credentials after the root credential in the chain.
 * @param {object[]} chain
 * @param {number} maxDepth
 */
export function assertMaxDelegationDepth(chain, maxDepth) {
  const delegationIndices = chain
    .map((vc, i) => (isDelegationCredentialType(vc) ? i : -1))
    .filter((i) => i >= 0);
  if (delegationIndices.length === 0) {
    return;
  }
  const onward = delegationIndices.filter((index) => index > 0).length;
  if (onward > maxDepth) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DEPTH_EXCEEDED,
      `Delegation chain has ${onward} onward delegation step(s), max allowed is ${maxDepth}`,
    );
  }
}
