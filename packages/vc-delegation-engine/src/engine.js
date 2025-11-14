// TODOs:
// See if it makes sense for cedar policies to know the credential type and do authorization based on that (will be needed for above)
// Investigate alias drift, see if we need to use IRIs more and within cedar policies (its ugly though, so id rather not if we can help it)

import jsonld from 'jsonld';
import { infer } from 'rify';

import {
  normalizeContextMap,
  shortenTerm,
  extractExpandedPresentationNode,
  extractExpandedVerificationMethod,
  firstExpandedValue,
  findExpandedTermId,
  normalizeSubject,
} from './jsonld-utils.js';
import { baseEntities, collectActorIds, applyCredentialFacts } from './cedar-utils.js';
import { firstArrayItem, toArray } from './utils.js';
import { buildRifyPremisesFromChain, buildRifyRules } from './rify-helpers.js';
import { collectAuthorizedClaims } from './claim-deduction.js';
import { VC_VC, VC_ISSUER } from './constants.js';
import { summarizeDelegationChain, summarizeStandaloneCredential } from './summarize.js';

const CONTROL_PREDICATES = new Set(['allows', 'delegatesTo', 'listsClaim', 'inheritsParent']);

function findUnauthorizedClaims(premises = [], derived = [], authorizedGraphId) {
  if (!authorizedGraphId) {
    return [];
  }

  const remainingPremises = new Map();
  premises.forEach(([subject, predicate, value, graph]) => {
    if (
      !subject
      || !predicate
      || CONTROL_PREDICATES.has(predicate)
      || typeof value === 'undefined'
      || typeof graph === 'undefined'
    ) {
      return;
    }
    const key = `${subject}:::${predicate}:::${value}`;
    if (!remainingPremises.has(key)) {
      remainingPremises.set(key, { subject, claim: predicate, value, issuer: graph });
    }
  });

  derived.forEach(([subject, predicate, value, graph]) => {
    if (graph !== authorizedGraphId || CONTROL_PREDICATES.has(predicate)) {
      return;
    }
    const key = `${subject}:::${predicate}:::${value}`;
    remainingPremises.delete(key);
  });

  return Array.from(remainingPremises.values());
}

// Normalizes thrown errors into a consistent failure record.
function normalizeFailure(error, { code = 'CHAIN_VALIDATION_ERROR' } = {}) {
  if (!error) {
    return { code, message: 'Unknown error' };
  }
  if (error.code && error.message) {
    return { code: error.code, message: error.message, stack: error.stack };
  }
  return { code, message: error.message ?? String(error), stack: error.stack };
}

// High-level helper: parse VP, build entities, run Cedar, and return decision plus failures.
export async function verifyVPWithDelegation({
  expandedPresentation,
  credentialContexts,
  failOnUnauthorizedClaims = false,
}) {
  try {
    if (!expandedPresentation) {
      throw new Error('verifyVPWithDelegation requires an expanded presentation');
    }

    const presentationNode = extractExpandedPresentationNode(expandedPresentation);
    const extractedSigner = extractExpandedVerificationMethod(presentationNode);
    const presentationSigner = typeof extractedSigner === 'string' && extractedSigner.length > 0
      ? extractedSigner
      : 'unknown';

    const normalizedById = new Map();
    const contexts = normalizeContextMap(credentialContexts);
    const referencedPreviousIds = new Set();
    const vcEntries = presentationNode[VC_VC] ?? [];

    for (const entry of vcEntries) {
      const credentialNode = firstArrayItem(
        entry?.['@graph'],
        'Expanded verifiableCredential entry is missing @graph node',
      );
      const credentialId = credentialNode?.['@id'];
      if (typeof credentialId !== 'string' || credentialId.length === 0) {
        throw new Error('Expanded credential node must include an @id');
      }

      const context = contexts.get(credentialId);
      if (!context) {
        throw new Error(`Missing compaction context for credential ${credentialId}`);
      }

      const compacted = await jsonld.compact(credentialNode, { '@context': context });
      const credentialSubject = normalizeSubject(compacted?.credentialSubject);

      const credential = {
        id: credentialId,
        type: toArray(credentialNode['@type']).map((value) => shortenTerm(value)),
        issuer: firstExpandedValue(credentialNode[VC_ISSUER]),
        previousCredentialId: findExpandedTermId(credentialNode, 'previousCredentialId'),
        rootCredentialId: findExpandedTermId(credentialNode, 'rootCredentialId'),
        credentialSubject,
        expandedNode: credentialNode,
      };

      normalizedById.set(credentialId, credential);
      const prevId = credential.previousCredentialId;
      if (typeof prevId === 'string' && prevId.length > 0) {
        referencedPreviousIds.add(prevId);
      }
    }

    const normalizedCredentials = Array.from(normalizedById.values());
    const tailCredentials = normalizedCredentials.filter((vc) => !referencedPreviousIds.has(vc.id));
    if (tailCredentials.length === 0) {
      throw new Error('Unable to determine tail credential');
    }

    const seenChains = new Set();
    const summaries = [];
    const evaluations = [];
    let lastFacts = null;
    let lastEntities = null;

    const buildChain = (tailId) => {
      if (seenChains.has(tailId)) {
        return null;
      }
      const chain = [];
      const visited = new Set();
      let current = normalizedById.get(tailId);
      if (!current) {
        throw new Error(`Tail credential ${tailId} not found in presentation`);
      }
      while (current) {
        if (visited.has(current.id)) {
          throw new Error('Delegation chain contains a cycle');
        }
        visited.add(current.id);
        chain.unshift(current);
        const prevId = current.previousCredentialId;
        if (!prevId) {
          break;
        }
        current = normalizedById.get(prevId);
        if (!current) {
          throw new Error(`Missing credential ${prevId} referenced by ${chain[0].id}`);
        }
      }
      seenChains.add(tailId);
      return chain;
    };

    const evaluateChain = async (chain) => {
      const rootCredentialId = chain[0]?.id;
      const hasDelegationLinks = chain.some(
        (vc) => typeof vc.previousCredentialId === 'string' && vc.previousCredentialId.length > 0,
      );
      const summary = hasDelegationLinks
        ? summarizeDelegationChain(chain.map((chainItem) => chainItem.expandedNode))
        : summarizeStandaloneCredential(chain[chain.length - 1]);
      const resourceId = summary.resourceId;
      const resolvedPrincipalId = presentationSigner;
      const authorizedGraphId = rootCredentialId ? `urn:authorized:${rootCredentialId}` : 'urn:authorized';

      const facts = {
        ...summary,
        resourceId,
        actionIds: ['Verify'],
        principalId: resolvedPrincipalId,
        presentationSigner,
      };
      const actorIds = collectActorIds(chain, presentationSigner);
      const entities = baseEntities(actorIds, facts.actionIds);
      applyCredentialFacts(entities, facts);

      const premises = buildRifyPremisesFromChain(chain, rootCredentialId);
      if (!Array.isArray(premises) || premises.some((quad) => quad.length !== 4)) {
        throw new Error('Invalid premises generated for rify inference');
      }
      const rules = buildRifyRules(rootCredentialId, authorizedGraphId);
      let derived;
      try {
        derived = infer(premises, rules);
      } catch (error) {
        throw new Error(`rify inference failed: ${error.message ?? error}`);
      }

      const { union: authorizedClaimUnion, perSubject: authorizedPerSubject } = collectAuthorizedClaims(
        chain,
        derived,
        authorizedGraphId,
        normalizedCredentials,
      );

      const unauthorizedClaims = findUnauthorizedClaims(premises, derived, authorizedGraphId);
      if (unauthorizedClaims.length > 0 && failOnUnauthorizedClaims) {
        const details = unauthorizedClaims
          .slice(0, 5)
          .map((claim) => `${claim.subject}.${claim.claim}`)
          .join(', ');
        throw new Error(
          `Unauthorized claims detected in delegation chain${details ? `: ${details}` : ''}`,
        );
      }

      facts.authorizedClaims = authorizedClaimUnion;
      facts.authorizedClaimsBySubject = authorizedPerSubject;
      summary.authorizedClaims = authorizedClaimUnion;
      summary.authorizedClaimsBySubject = authorizedPerSubject;

      return {
        summary,
        facts,
        entities,
        chain,
        premises,
        derived,
        authorizedClaims: authorizedClaimUnion,
        authorizedClaimsBySubject: authorizedPerSubject,
      };
    };

    for (const tail of tailCredentials) {
      const chain = buildChain(tail.id);
      if (!chain) {
        continue;
      }
      const evaluation = await evaluateChain(chain);
      const {
        summary, facts, entities,
      } = evaluation;
      summaries.push(summary);
      evaluations.push(evaluation);
      lastFacts = facts;
      lastEntities = entities;
    }

    return {
      decision: 'allow',
      failures: [],
      summary: summaries[summaries.length - 1] ?? null,
      summaries,
      facts: lastFacts,
      entities: lastEntities,
      evaluations,
    };
  } catch (error) {
    return {
      decision: 'deny',
      failures: [normalizeFailure(error)],
      summary: null,
      facts: null,
      entities: null,
      evaluations: [],
    };
  }
}
