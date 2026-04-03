import {
  normalizeContextMap,
  extractExpandedPresentationNode,
  extractExpandedVerificationMethod,
} from './jsonld-utils.js';
import { VC_VC, UNKNOWN_IDENTIFIER } from './constants.js';
import { DelegationError, DelegationErrorCodes, normalizeDelegationFailure } from './errors.js';
import {
  ingestAllPresentationCredentials,
  assertDelegationReferencesResolved,
} from './engine/presentation-ingest.js';
import {
  buildCredentialChainFromTail,
  evaluateDelegationChainForPresentation,
} from './engine/chain-evaluation.js';

/**
 * @typedef {Object} DelegationSummary
 * @property {string} resourceId
 * @property {Array} delegations
 * @property {string[]} rootTypes
 * @property {string[]} tailTypes
 * @property {string} rootIssuerId
 * @property {string} tailIssuerId
 * @property {number} tailDepth
 * @property {Record<string, unknown>} authorizedClaims
 * @property {Record<string, Record<string, unknown>>} authorizedClaimsBySubject
 * @property {string[]} [resourceTypes]
 */

/**
 * @typedef {Object} DelegationFacts
 * @property {string} resourceId
 * @property {Array} delegations
 * @property {string[]} rootTypes
 * @property {string[]} tailTypes
 * @property {string} rootIssuerId
 * @property {string} tailIssuerId
 * @property {number} tailDepth
 * @property {string[]} actionIds
 * @property {string} principalId
 * @property {string} presentationSigner
 * @property {Record<string, unknown>} authorizedClaims
 * @property {Record<string, Record<string, unknown>>} authorizedClaimsBySubject
 * @property {string[]} [resourceTypes]
 * @property {Record<string, unknown>|null} [parentClaims]
 */

/**
 * @typedef {Object} DelegationEvaluation
 * @property {DelegationSummary} summary
 * @property {DelegationFacts} facts
 * @property {Array} entities
 * @property {Array} chain
 * @property {Array} premises
 * @property {Array} derived
 * @property {Record<string, unknown>} authorizedClaims
 * @property {Record<string, Record<string, unknown>>} authorizedClaimsBySubject
 * @property {string[]} [resourceTypes]
 * @property {Record<string, unknown>|null} [parentClaims]
 */

/**
 * @typedef {Object} VerifyDelegationResult
 * @property {'allow'|'deny'} decision
 * @property {Array<{code:string,message:string,stack?:string}>} failures
 * @property {DelegationSummary|null} summary
 * @property {DelegationSummary[]} summaries
 * @property {DelegationFacts|null} facts
 * @property {Array|null} entities
 * @property {DelegationEvaluation[]} evaluations
 * @property {string[]} [skippedCredentialIds]
 * @property {Array<{credentialId:string,issuerId?:string,subjectId?:string,types?:string[],claims?:Record<string,unknown>}>} [skippedCredentials]
 */

function normalizeFailure(error) {
  return normalizeDelegationFailure(error);
}

// High-level helper: parse VP, build entities, and return decision plus failures.
/**
 * @param {Object} options
 * @param {any[]} options.expandedPresentation
 * @param {Map<string, any>|Object} options.credentialContexts
 * @param {boolean} [options.failOnUnauthorizedClaims=false]
 * @param {Function} [options.documentLoader]
 * @param {object} [options.delegationPolicy]
 * @param {boolean} [options.delegationPolicy.enabled=true] When false, skip delegation policy digest/semantics even if credentials reference a policy.
 * @description When a chain references delegationPolicyId/digest and policy checks are enabled, `documentLoader` is required and must return the policy JSON for that id (null or non-object responses fail verification). The verifier checks digest, semantic policy rules (including unique capability names per role and globally), each delegation credential’s role as descendant-or-self of the previous delegation role on the policy graph, child `expirationDate` not after its parent credential in the chain, disclosed `credentialSubject` keys against the effective role’s attributes (with `["*"]`) and capability grants, grant value validation, and monotonic narrowing of subject claims along the chain. Whether each credential is currently valid by its issuance and expiration dates is enforced by verifiable-credential verification, not by this engine.
 * @returns {Promise<VerifyDelegationResult>}
 */
export async function verifyVPWithDelegation({
  expandedPresentation,
  credentialContexts,
  failOnUnauthorizedClaims = false,
  documentLoader,
  delegationPolicy,
}) {
  const skippedCredentialIds = new Set();
  const skippedCredentials = [];
  try {
    if (!expandedPresentation) {
      throw new DelegationError(
        DelegationErrorCodes.INVALID_PRESENTATION,
        'verifyVPWithDelegation requires an expanded presentation',
      );
    }

    const presentationNode = extractExpandedPresentationNode(expandedPresentation);
    const extractedSigner = extractExpandedVerificationMethod(presentationNode);
    const presentationSigner = typeof extractedSigner === 'string' && extractedSigner.length > 0
      ? extractedSigner
      : UNKNOWN_IDENTIFIER;

    const contexts = normalizeContextMap(credentialContexts);
    const vcEntries = presentationNode[VC_VC] ?? [];
    const { normalizedById, referencedPreviousIds } = await ingestAllPresentationCredentials(
      vcEntries,
      {
        contexts,
        documentLoader,
        skippedCredentialIds,
        skippedCredentials,
      },
    );

    const normalizedCredentials = Array.from(normalizedById.values());
    if (normalizedCredentials.length === 0) {
      return {
        decision: 'allow',
        failures: [],
        summary: null,
        summaries: [],
        facts: null,
        entities: null,
        evaluations: [],
        skippedCredentialIds: Array.from(skippedCredentialIds),
        skippedCredentials,
      };
    }

    normalizedCredentials.forEach((credential) => {
      assertDelegationReferencesResolved(credential, normalizedById);
    });

    const tailCredentials = normalizedCredentials.filter((vc) => !referencedPreviousIds.has(vc.id));
    if (tailCredentials.length === 0) {
      throw new DelegationError(
        DelegationErrorCodes.INVALID_PRESENTATION,
        'Unable to determine tail credential',
      );
    }

    const seenChains = new Set();
    const summaries = [];
    const evaluations = [];
    let lastFacts = null;
    let lastEntities = null;

    for (const tail of tailCredentials) {
      const chain = buildCredentialChainFromTail(normalizedById, tail.id, seenChains);
      if (chain) {
        // eslint-disable-next-line no-await-in-loop
        const evaluation = await evaluateDelegationChainForPresentation({
          chain,
          delegationPolicy,
          documentLoader,
          failOnUnauthorizedClaims,
          normalizedCredentials,
          presentationSigner,
        });
        const {
          summary, facts, entities,
        } = evaluation;
        summaries.push(summary);
        evaluations.push(evaluation);
        lastFacts = facts;
        lastEntities = entities;
      }
    }

    return {
      decision: 'allow',
      failures: [],
      summary: summaries[summaries.length - 1] ?? null,
      summaries,
      facts: lastFacts,
      entities: lastEntities,
      evaluations,
      skippedCredentialIds: Array.from(skippedCredentialIds),
      skippedCredentials,
    };
  } catch (error) {
    return {
      decision: 'deny',
      failures: [normalizeFailure(error)],
      summary: null,
      summaries: [],
      facts: null,
      entities: null,
      evaluations: [],
      skippedCredentialIds: Array.from(skippedCredentialIds),
      skippedCredentials,
    };
  }
}
