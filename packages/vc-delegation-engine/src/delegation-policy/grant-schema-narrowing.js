import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { DelegationError, DelegationErrorCodes } from '../errors.js';

function throwInvalidGrantSchemas(capabilityName) {
  throw new DelegationError(
    DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
    `Invalid capability grant schemas for "${capabilityName}"`,
  );
}

function assertMinMaxItemsNarrowing(parentSchema, childSchema, capabilityName) {
  const pMin = parentSchema.minItems;
  const cMin = childSchema.minItems;
  if (typeof pMin === 'number' && typeof cMin === 'number' && cMin < pMin) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" minItems must be >= parent minItems`,
    );
  }
  const pMax = parentSchema.maxItems;
  const cMax = childSchema.maxItems;
  if (typeof pMax === 'number' && typeof cMax === 'number' && cMax > pMax) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" maxItems must be <= parent maxItems`,
    );
  }
}

function assertNumericBoundsNarrowing(parentSchema, childSchema, capabilityName) {
  const pMin = parentSchema.minimum;
  const cMin = childSchema.minimum;
  if (typeof pMin === 'number' && typeof cMin === 'number' && cMin < pMin) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" minimum must be >= parent minimum`,
    );
  }
  const pMax = parentSchema.maximum;
  const cMax = childSchema.maximum;
  if (typeof pMax === 'number' && typeof cMax === 'number' && cMax > pMax) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" maximum must be <= parent maximum`,
    );
  }
}

function assertGrantArrayPairNarrowing(childSchema, parentSchema, capabilityName, isNested) {
  assertMinMaxItemsNarrowing(parentSchema, childSchema, capabilityName);
  const pi = parentSchema.items;
  const ci = childSchema.items;
  if (
    pi
    && ci
    && typeof pi === 'object'
    && typeof ci === 'object'
    && !Array.isArray(pi)
    && !Array.isArray(ci)
  ) {
    assertGrantSchemaNarrowing(ci, pi, `${capabilityName}.items`, true);
  }
  if (!isNested) {
    assertTopLevelGrantKeysAllowed(childSchema, capabilityName);
  }
}

function assertGrantTypesMatch(parentType, childType, capabilityName) {
  if (parentType !== undefined && childType !== undefined && parentType !== childType) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" grant type must match parent (got ${childType}, parent ${parentType})`,
    );
  }
}

function assertConstNarrowing(childSchema, parentSchema, capabilityName) {
  if (!Object.prototype.hasOwnProperty.call(parentSchema, 'const')) {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(childSchema, 'const')) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" child grant must repeat parent const`,
    );
  }
  if (childSchema.const !== parentSchema.const) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" const must equal parent const`,
    );
  }
}

function assertEnumNarrowingBothDefined(childSchema, parentSchema, capabilityName) {
  const parentSet = new Set(parentSchema.enum);
  const ok = childSchema.enum.every((v) => parentSet.has(v));
  if (!ok) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" grant enum must be subset of parent enum`,
    );
  }
}

function assertEnumNarrowingChildOnly(childSchema, parentSchema, capabilityName) {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  try {
    const validate = ajv.compile(parentSchema);
    const ok = childSchema.enum.every((v) => validate(v));
    if (!ok) {
      throw new DelegationError(
        DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
        `Capability "${capabilityName}" grant enum values must satisfy parent schema`,
      );
    }
  } catch (e) {
    if (e instanceof DelegationError) {
      throw e;
    }
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" could not verify enum against parent: ${e.message ?? e}`,
    );
  }
}

function assertEnumNarrowing(childSchema, parentSchema, capabilityName) {
  if (Array.isArray(parentSchema.enum) && Array.isArray(childSchema.enum)) {
    assertEnumNarrowingBothDefined(childSchema, parentSchema, capabilityName);
    return;
  }
  if (Array.isArray(childSchema.enum) && !Array.isArray(parentSchema.enum)) {
    assertEnumNarrowingChildOnly(childSchema, parentSchema, capabilityName);
  }
}

function assertPatternNarrowing(childSchema, parentSchema, capabilityName) {
  if (
    typeof parentSchema.pattern === 'string'
    && typeof childSchema.pattern === 'string'
    && parentSchema.pattern !== childSchema.pattern
  ) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" pattern must match parent pattern unless identical narrowing is documented`,
    );
  }
}

function assertItemsEnumSubset(childSchema, parentSchema, capabilityName) {
  const pItems = parentSchema.items;
  const cItems = childSchema.items;
  if (
    !pItems
    || !cItems
    || typeof pItems !== 'object'
    || typeof cItems !== 'object'
    || Array.isArray(pItems)
    || Array.isArray(cItems)
    || !Array.isArray(pItems.enum)
    || !Array.isArray(cItems.enum)
  ) {
    return;
  }
  const pSet = new Set(pItems.enum);
  if (!cItems.enum.every((v) => pSet.has(v))) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" items.enum must be subset of parent items.enum`,
    );
  }
}

function assertTopLevelGrantKeysAllowed(childSchema, capabilityName) {
  const allowedKeys = new Set([
    'type', 'enum', 'const', 'minItems', 'maxItems', 'uniqueItems', 'items', 'pattern', 'minimum', 'maximum',
  ]);
  const childKeys = Object.keys(childSchema).filter((k) => !k.startsWith('$'));
  const unknown = childKeys.filter((k) => !allowedKeys.has(k));
  if (unknown.length > 0) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_SEMANTIC_INVALID,
      `Capability "${capabilityName}" grant schema contains unsupported keywords for narrowing check: ${unknown.join(', ')}`,
    );
  }
}

/**
 * Practical JSON-schema narrowing check (child stricter or equal to parent).
 * Unknown keywords cause validation to fail (strict verifier) at top level only.
 * @param {object} childSchema
 * @param {object} parentSchema
 * @param {string} capabilityName
 * @param {boolean} [isNested]
 * @returns {void}
 */
export function assertGrantSchemaNarrowing(childSchema, parentSchema, capabilityName, isNested = false) {
  if (!childSchema || typeof childSchema !== 'object' || !parentSchema || typeof parentSchema !== 'object') {
    throwInvalidGrantSchemas(capabilityName);
  }

  const parentType = parentSchema.type;
  const childType = childSchema.type;

  if (parentType === 'array' && childType === 'array') {
    assertGrantArrayPairNarrowing(childSchema, parentSchema, capabilityName, isNested);
    return;
  }

  assertGrantTypesMatch(parentType, childType, capabilityName);
  assertConstNarrowing(childSchema, parentSchema, capabilityName);
  assertEnumNarrowing(childSchema, parentSchema, capabilityName);
  assertMinMaxItemsNarrowing(parentSchema, childSchema, capabilityName);
  assertNumericBoundsNarrowing(parentSchema, childSchema, capabilityName);
  assertPatternNarrowing(childSchema, parentSchema, capabilityName);
  assertItemsEnumSubset(childSchema, parentSchema, capabilityName);

  if (!isNested) {
    assertTopLevelGrantKeysAllowed(childSchema, capabilityName);
  }
}
