import { verifyPolicyDigest } from '../delegation-policy-digest.js';
import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { validateDelegationPolicy } from './policy-semantics.js';
import { assertPolicyBindingsConsistentInChain } from './chain-types-binding.js';
import { verifyDelegationPolicyChain } from './chain-verify.js';

/**
 * Load delegation policy JSON using the same documentLoader contract as JSON-LD (returns `{ document }` or compatible).
 * @param {(url: string) => Promise<{document?: unknown, contextUrl?: null, documentUrl?: string}>} documentLoader
 * @param {string} policyId
 * @returns {Promise<object>}
 */
export async function fetchDelegationPolicyJson(documentLoader, policyId) {
  if (typeof documentLoader !== 'function') {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DOCUMENT_LOADER_REQUIRED,
      'documentLoader is required when verifying credentials that reference a delegation policy',
    );
  }
  let loaded;
  try {
    loaded = await documentLoader(policyId);
  } catch (error) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DOCUMENT_LOAD_FAILED,
      `Could not load delegation policy "${policyId}": ${error?.message ?? error}`,
    );
  }
  const hasDocumentField = loaded && typeof loaded === 'object'
    && Object.prototype.hasOwnProperty.call(loaded, 'document');
  const policyJson = hasDocumentField ? loaded.document : loaded;
  if (!policyJson || typeof policyJson !== 'object') {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DOCUMENT_LOAD_FAILED,
      `documentLoader did not return a delegation policy document for "${policyId}"`,
    );
  }
  return policyJson;
}

/**
 * Resolve policy via documentLoader, verify id/digest, validate document and chain constraints.
 * @param {object} options
 * @param {object[]} options.chain
 * @param {string} options.rootPolicyId
 * @param {string} options.rootPolicyDigest
 * @param {(url: string) => Promise<{document?: unknown}>} options.documentLoader
 */
export async function resolveAndVerifyDelegationPolicy({
  chain,
  rootPolicyId,
  rootPolicyDigest,
  documentLoader,
}) {
  const policyJson = await fetchDelegationPolicyJson(documentLoader, rootPolicyId);
  if (policyJson.id !== rootPolicyId) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_ID_MISMATCH,
      `Resolved policy id "${policyJson.id}" does not match credential delegationPolicyId`,
    );
  }
  if (!verifyPolicyDigest(policyJson, rootPolicyDigest)) {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DIGEST_MISMATCH,
      'delegationPolicyDigest does not match SHA-256 of canonical JSON policy document',
    );
  }
  validateDelegationPolicy(policyJson);
  assertPolicyBindingsConsistentInChain(chain, rootPolicyId, rootPolicyDigest);
  verifyDelegationPolicyChain(chain, policyJson);
  return policyJson;
}
