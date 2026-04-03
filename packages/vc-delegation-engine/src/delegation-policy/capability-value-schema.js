import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { DelegationError, DelegationErrorCodes } from '../errors.js';

let valueAjv = null;

function getValueAjv() {
  if (!valueAjv) {
    valueAjv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(valueAjv);
  }
  return valueAjv;
}

/**
 * @param {unknown} value
 * @param {object} schema
 * @param {string} label
 */
export function validateCapabilityValueAgainstSchema(value, schema, label) {
  const ajv = getValueAjv();
  const validate = ajv.compile(schema);
  if (validate(value)) {
    return;
  }
  const detail = validate.errors?.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')
    ?? 'validation error';
  throw new DelegationError(
    DelegationErrorCodes.POLICY_CAPABILITY_INVALID,
    `Capability value invalid for ${label}: ${detail}`,
  );
}
