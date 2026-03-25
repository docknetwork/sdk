import { assertMaxDelegationDepth } from './chain-depth.js';
import { assertChainCredentialMonotonicity } from './chain-monotonic.js';
import {
  assertChildCredentialExpiresBeforeOrEqualParent,
  assertDelegationChainRoles,
} from './chain-roles-lifetime.js';
import { assertChainSubjectCapabilitiesMatchPolicy } from './chain-subject-role.js';
import { isDelegationCredentialType } from './chain-types-binding.js';

/**
 * @param {object[]} chain
 * @param {object} policyJson
 */
export function verifyDelegationPolicyChain(chain, policyJson) {
  const { ruleset } = policyJson;
  const roleById = new Map(ruleset.roles.map((r) => [r.roleId, r]));
  const capabilityNames = new Set(ruleset.capabilities.map((c) => c.name));
  assertMaxDelegationDepth(chain, ruleset.overallConstraints.maxDelegationDepth);

  const delegationCreds = chain.filter((vc) => isDelegationCredentialType(vc));
  assertDelegationChainRoles(delegationCreds, roleById);
  assertChainSubjectCapabilitiesMatchPolicy(chain, roleById);
  for (let i = 1; i < chain.length; i += 1) {
    assertChildCredentialExpiresBeforeOrEqualParent(chain[i - 1], chain[i]);
  }
  assertChainCredentialMonotonicity(chain, capabilityNames);
}
