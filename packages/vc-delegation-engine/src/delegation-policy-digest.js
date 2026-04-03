import { createHash, timingSafeEqual } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';

/**
 * @param {object} policyObject
 * @returns {string}
 */
export function canonicalPolicyJson(policyObject) {
  return canonicalize(policyObject);
}

/**
 * @param {string} inputUtf8
 * @returns {string} lowercase hex
 */
export function sha256Hex(inputUtf8) {
  return createHash('sha256').update(inputUtf8, 'utf8').digest('hex');
}

/**
 * @param {object} policyObject
 * @returns {string}
 */
export function computePolicyDigestHex(policyObject) {
  return sha256Hex(canonicalPolicyJson(policyObject));
}

/**
 * Constant-time comparison of two lowercase hex strings (SHA-256 length).
 * @param {string} expectedHex
 * @param {string} actualHex
 * @returns {boolean}
 */
export function digestsEqual(expectedHex, actualHex) {
  if (
    typeof expectedHex !== 'string'
    || typeof actualHex !== 'string'
    || expectedHex.length !== actualHex.length
  ) {
    return false;
  }
  if (!/^[0-9a-f]+$/i.test(expectedHex) || !/^[0-9a-f]+$/i.test(actualHex)) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'));
  } catch {
    return false;
  }
}

/**
 * @param {object} policyObject
 * @param {string} expectedHex
 * @returns {boolean}
 */
export function verifyPolicyDigest(policyObject, expectedHex) {
  const computed = computePolicyDigestHex(policyObject);
  return digestsEqual(String(expectedHex).toLowerCase(), computed.toLowerCase());
}
