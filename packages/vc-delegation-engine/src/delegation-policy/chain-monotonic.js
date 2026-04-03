import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { RESERVED_SUBJECT_KEYS } from './reserved-subject-keys.js';

function normalizeTokenValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTokenValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeTokenValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function scalarTokenForSet(v) {
  return (v && typeof v === 'object') ? JSON.stringify(normalizeTokenValue(v)) : v;
}

function objectValuesEqual(parentVal, childVal) {
  if (!parentVal || !childVal || typeof parentVal !== 'object' || typeof childVal !== 'object') {
    return false;
  }
  return scalarTokenForSet(parentVal) === scalarTokenForSet(childVal);
}

function valueAsComparisonArray(val) {
  if (Array.isArray(val)) {
    return val;
  }
  if (val != null) {
    return [val];
  }
  return [];
}

function assertBooleanNarrowing(parentVal, childVal, label) {
  if (childVal === true && parentVal !== true) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
      `${label} broadens a boolean claim relative to the parent credential`,
    );
  }
}

function assertNumericNarrowing(parentVal, childVal, label) {
  if (childVal > parentVal) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
      `${label} must not exceed the parent credential numeric cap`,
    );
  }
}

function assertArraySubsetNarrowing(parentVal, childVal, label) {
  const pArr = valueAsComparisonArray(parentVal);
  const cArr = valueAsComparisonArray(childVal);
  const parentSet = new Set(pArr.map(scalarTokenForSet));
  const ok = cArr.every((v) => parentSet.has(scalarTokenForSet(v)));
  if (!ok) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
      `${label} is not a subset of the parent credential value`,
    );
  }
}

function assertComparableValueNarrowerOrEqual(parentVal, childVal, label) {
  if (typeof parentVal === 'boolean' || typeof childVal === 'boolean') {
    assertBooleanNarrowing(parentVal, childVal, label);
    return;
  }
  const bothNumbers = typeof parentVal === 'number' && typeof childVal === 'number'
    && !Number.isNaN(parentVal) && !Number.isNaN(childVal);
  if (bothNumbers) {
    assertNumericNarrowing(parentVal, childVal, label);
    return;
  }
  if (Array.isArray(parentVal) || Array.isArray(childVal)) {
    assertArraySubsetNarrowing(parentVal, childVal, label);
    return;
  }
  if (objectValuesEqual(parentVal, childVal)) {
    return;
  }
  if (parentVal !== childVal) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
      `${label} must match the parent credential value or narrow it`,
    );
  }
}

/**
 * @param {object} parentVc
 * @param {object} childVc
 * @param {Set<string>} capabilityNames
 */
export function assertAdjacentCredentialsMonotonic(parentVc, childVc, capabilityNames) {
  const parentSub = parentVc.credentialSubject ?? {};
  const childSub = childVc.credentialSubject ?? {};
  for (const cap of capabilityNames) {
    if (!Object.prototype.hasOwnProperty.call(childSub, cap)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(parentSub, cap)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
        `Credential ${childVc.id} includes capability field "${cap}" not present on parent ${parentVc.id}`,
      );
    }
    assertComparableValueNarrowerOrEqual(
      parentSub[cap],
      childSub[cap],
      `Credential ${childVc.id} subject.${cap}`,
    );
  }
  for (const key of Object.keys(childSub)) {
    if (RESERVED_SUBJECT_KEYS.has(key) || capabilityNames.has(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(parentSub, key)) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_MONOTONIC_VIOLATION,
        `Credential ${childVc.id} discloses "${key}" which is absent on parent ${parentVc.id}`,
      );
    }
    assertComparableValueNarrowerOrEqual(
      parentSub[key],
      childSub[key],
      `Credential ${childVc.id} subject.${key}`,
    );
  }
}

/**
 * Each credential after the root must not broaden subject claims vs its immediate predecessor.
 * @param {object[]} chain
 * @param {Set<string>} capabilityNames
 */
export function assertChainCredentialMonotonicity(chain, capabilityNames) {
  if (!Array.isArray(chain) || chain.length < 2) {
    return;
  }
  for (let i = 1; i < chain.length; i += 1) {
    assertAdjacentCredentialsMonotonic(chain[i - 1], chain[i], capabilityNames);
  }
}
