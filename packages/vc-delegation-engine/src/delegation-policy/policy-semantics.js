import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { assertGrantSchemaNarrowing } from './grant-schema-narrowing.js';

/**
 * @param {string[]} childAttrs
 * @param {string[]} parentAttrs
 * @returns {boolean}
 */
export function attributesAreNarrowerOrEqual(childAttrs, parentAttrs) {
  const child = Array.isArray(childAttrs) ? childAttrs : [];
  const parent = Array.isArray(parentAttrs) ? parentAttrs : [];
  if (parent.includes('*')) {
    return true;
  }
  const parentSet = new Set(parent);
  return child.every((a) => parentSet.has(a));
}

function validateRoleParentsExist(roles, roleIds) {
  for (const role of roles) {
    if (role.parentRoleId !== null && !roleIds.has(role.parentRoleId)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Role "${role.roleId}" parentRoleId "${role.parentRoleId}" does not exist`,
      );
    }
  }
}

function validateRolesGrantsAgainstCapabilities(roles, capabilities, capabilityNames) {
  for (const role of roles) {
    const grantCaps = role.capabilityGrants.map((g) => g.capability);
    if (new Set(grantCaps).size !== grantCaps.length) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Role "${role.roleId}" capabilityGrants must use unique capability names`,
      );
    }
    for (const grant of role.capabilityGrants) {
      if (!capabilityNames.has(grant.capability)) {
        throw new DelegationError(
          DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
          `Role "${role.roleId}" references unknown capability "${grant.capability}"`,
        );
      }
      const baseDef = capabilities.find((c) => c.name === grant.capability);
      assertGrantSchemaNarrowing(grant.schema, baseDef.schema, grant.capability);
    }
  }
}

function validateRolesNarrowingVersusParents(roles, roleById) {
  for (const role of roles) {
    if (role.parentRoleId !== null) {
      const parent = roleById.get(role.parentRoleId);
      if (parent) {
        validateSingleRoleVersusParent(role, parent);
      }
    }
  }
}

function validateSingleRoleVersusParent(role, parent) {
  if (!attributesAreNarrowerOrEqual(role.attributes, parent.attributes)) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Role "${role.roleId}" attributes must be narrower or equal to parent "${role.parentRoleId}"`,
    );
  }
  const parentGrantByCap = new Map(parent.capabilityGrants.map((g) => [g.capability, g]));
  for (const grant of role.capabilityGrants) {
    const pGrant = parentGrantByCap.get(grant.capability);
    if (!pGrant) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Role "${role.roleId}" capability "${grant.capability}" not granted to parent "${role.parentRoleId}"`,
      );
    }
    assertGrantSchemaNarrowing(grant.schema, pGrant.schema, grant.capability);
  }
}

/**
 * When `cannotDelegateToSameRole` is true, the role must have at least one child role in the graph
 * so a delegator can move to a strict sub-role.
 * @param {object[]} roles
 */
function validateCannotDelegateToSameRoleOnRoles(roles) {
  for (const role of roles) {
    const flag = role.cannotDelegateToSameRole;
    if (flag !== undefined && typeof flag !== 'boolean') {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Role "${role.roleId}" cannotDelegateToSameRole must be a boolean when present`,
      );
    }
    if (flag === true) {
      const hasSubRole = roles.some((r) => r.parentRoleId === role.roleId);
      if (!hasSubRole) {
        throw new DelegationError(
          DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
          `Role "${role.roleId}" sets cannotDelegateToSameRole but the policy defines no sub-role of that role`,
        );
      }
    }
  }
}

function assertRoleHierarchyAcyclic(roles, roleById) {
  const visited = new Set();
  const stack = new Set();
  function dfs(roleId) {
    if (stack.has(roleId)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Cycle detected in role hierarchy at "${roleId}"`,
      );
    }
    if (visited.has(roleId)) {
      return;
    }
    visited.add(roleId);
    stack.add(roleId);
    const role = roleById.get(roleId);
    if (role?.parentRoleId) {
      dfs(role.parentRoleId);
    }
    stack.delete(roleId);
  }
  for (const r of roles) {
    if (!visited.has(r.roleId)) {
      dfs(r.roleId);
    }
  }
}

/**
 * @param {object} policyJson
 * @returns {void}
 */
export function validateDelegationPolicySemantics(policyJson) {
  const { roles, capabilities } = policyJson.ruleset;
  const capabilityNames = validateUniqueCapabilityNames(capabilities);
  const { roleById, roleIds } = buildRoleMaps(roles);

  validateRoleParentsExist(roles, roleIds);
  validateCannotDelegateToSameRoleOnRoles(roles);
  validateRolesGrantsAgainstCapabilities(roles, capabilities, capabilityNames);
  validateRolesNarrowingVersusParents(roles, roleById);
  assertRoleHierarchyAcyclic(roles, roleById);
}

function assertRulesetShape(ruleset) {
  if (!Array.isArray(ruleset.roles)) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'Delegation policy ruleset.roles must be an array',
    );
  }
  if (!Array.isArray(ruleset.capabilities)) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'Delegation policy ruleset.capabilities must be an array',
    );
  }
  const maxDepth = ruleset.overallConstraints?.maxDelegationDepth;
  const isValidDepth = Number.isInteger(maxDepth) && maxDepth >= 0;
  if (!isValidDepth) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'Delegation policy ruleset.overallConstraints.maxDelegationDepth must be a non-negative integer',
    );
  }
}

function validateUniqueCapabilityNames(capabilities) {
  const capabilityNames = new Set(capabilities.map((c) => c.name));
  if (capabilityNames.size !== capabilities.length) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'ruleset.capabilities names must be unique',
    );
  }
  return capabilityNames;
}

function buildRoleMaps(roles) {
  const roleById = new Map(roles.map((r) => [r.roleId, r]));
  const roleIds = new Set(roleById.keys());
  if (roleIds.size !== roles.length) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'ruleset.roles roleId values must be unique',
    );
  }
  return { roleById, roleIds };
}

/**
 * Semantic checks only (role graph, grant narrowing, capability registry, cannotDelegateToSameRole shape). No JSON Schema for the policy document.
 * @param {unknown} policyJson
 */
export function validateDelegationPolicy(policyJson) {
  if (!policyJson || typeof policyJson !== 'object') {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'Delegation policy must be a non-null object',
    );
  }
  if (!policyJson.ruleset || typeof policyJson.ruleset !== 'object') {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      'Delegation policy must include a ruleset object',
    );
  }
  assertRulesetShape(policyJson.ruleset);
  validateDelegationPolicySemantics(policyJson);
}
