import { DelegationError, DelegationErrorCodes } from '../errors.js';

/**
 * @param {string} ancestorRoleId
 * @param {string} descendantRoleId
 * @param {Map<string, object>} roleById
 * @returns {boolean}
 */
export function isRoleAncestorOrEqual(ancestorRoleId, descendantRoleId, roleById) {
  let current = descendantRoleId;
  while (current != null) {
    if (current === ancestorRoleId) {
      return true;
    }
    current = roleById.get(current)?.parentRoleId ?? null;
  }
  return false;
}

/**
 * @param {object} parentVc
 * @param {object} childVc
 */
export function assertChildCredentialExpiresBeforeOrEqualParent(parentVc, childVc) {
  const pExp = parentVc?.expirationDate;
  const cExp = childVc?.expirationDate;
  if (typeof pExp !== 'string' || pExp.length === 0 || typeof cExp !== 'string' || cExp.length === 0) {
    return;
  }
  const tp = Date.parse(pExp);
  const tc = Date.parse(cExp);
  if (Number.isNaN(tp) || Number.isNaN(tc)) {
    return;
  }
  if (tc > tp) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_LIFETIME_INVALID,
      `Credential ${childVc.id} expirationDate must not be after parent credential ${parentVc.id} expirationDate`,
    );
  }
}

/**
 * @param {object[]} delegationCreds
 * @param {Map<string, object>} roleById
 */
export function assertDelegationChainRoles(delegationCreds, roleById) {
  for (let i = 0; i < delegationCreds.length; i += 1) {
    const vc = delegationCreds[i];
    const roleId = vc.delegationRoleId;
    if (typeof roleId !== 'string' || roleId.length === 0) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_ROLE_INVALID,
        `Delegation credential ${vc.id} is missing delegationRoleId`,
      );
    }
    if (!roleById.has(roleId)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_ROLE_INVALID,
        `Credential ${vc.id} delegationRoleId "${roleId}" is not defined in policy`,
      );
    }
    if (i > 0) {
      const prev = delegationCreds[i - 1];
      const prevRoleId = prev.delegationRoleId;
      if (!isRoleAncestorOrEqual(prevRoleId, roleId, roleById)) {
        throw new DelegationError(
          DelegationErrorCodes.POLICY_ROLE_INVALID,
          `Credential ${vc.id} delegationRoleId "${roleId}" must be the same role as or a descendant of the previous delegation step role "${prevRoleId}" per the policy role graph`,
        );
      }
    }
  }
}
