import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { validateCapabilityValueAgainstSchema } from './capability-value-schema.js';
import { coerceCapabilityValueForSchema } from './chain-types-binding.js';
import { RESERVED_SUBJECT_KEYS } from './reserved-subject-keys.js';

/**
 * @param {object} subject
 * @param {object} grant
 * @param {string} credentialId
 */
function validateSubjectCapabilityGrant(subject, grant, credentialId) {
  if (!Object.prototype.hasOwnProperty.call(subject, grant.capability)) {
    return;
  }
  const raw = subject[grant.capability];
  const coerced = coerceCapabilityValueForSchema(raw, grant.schema);
  validateCapabilityValueAgainstSchema(
    coerced,
    grant.schema,
    `${credentialId} subject.${grant.capability}`,
  );
}

/**
 * @param {string} key credentialSubject key (compact term)
 * @param {object} roleDef
 * @returns {boolean}
 */
export function subjectFieldDisclosureAllowedByRole(key, roleDef) {
  const attrs = roleDef.attributes;
  const granted = Array.isArray(roleDef.capabilityGrants)
    && roleDef.capabilityGrants.some((g) => g.capability === key);
  if (!Array.isArray(attrs)) {
    return granted;
  }
  if (attrs.includes('*')) {
    return true;
  }
  const path = `credentialSubject.${key}`;
  if (attrs.includes(path) || attrs.includes(key)) {
    return true;
  }
  return granted;
}

function validateSubjectDisclosuresForRole(subject, roleDef, credentialId) {
  for (const key of Object.keys(subject)) {
    const skipKey = RESERVED_SUBJECT_KEYS.has(key) || subject[key] === undefined;
    if (!skipKey && !subjectFieldDisclosureAllowedByRole(key, roleDef)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_ROLE_INVALID,
        `Credential ${credentialId} discloses subject field "${key}" which is not allowed by role "${roleDef.roleId}" attributes (or an explicit capability grant for that field)`,
      );
    }
  }
}

function validateVcSubjectAgainstEffectiveRole(vc, roleDef, effectiveRoleId) {
  if (!roleDef) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_ROLE_INVALID,
      `No policy role for effective role "${effectiveRoleId}"`,
    );
  }
  const subject = vc.credentialSubject ?? {};
  for (const grant of roleDef.capabilityGrants) {
    validateSubjectCapabilityGrant(subject, grant, vc.id);
  }
  validateSubjectDisclosuresForRole(subject, roleDef, vc.id);
}

/**
 * @param {object[]} chain
 * @param {Map<string, object>} roleById
 */
export function assertChainSubjectCapabilitiesMatchPolicy(chain, roleById) {
  let lastDelegationRoleId = null;
  for (const vc of chain) {
    if (typeof vc.delegationRoleId === 'string' && vc.delegationRoleId.length > 0) {
      lastDelegationRoleId = vc.delegationRoleId;
    }
    if (lastDelegationRoleId) {
      validateVcSubjectAgainstEffectiveRole(
        vc,
        roleById.get(lastDelegationRoleId),
        lastDelegationRoleId,
      );
    }
  }
}
