// TODOs:
// Make cedar policies optional, and split from this file
// Have this file focus on claim deduction and chain validation, returning authorized claims
// After splitting cedar logic, test that it works without credential delegation too. We would run cedar policy check per credential in a VP (like per delegation chain)
// Support presentations that have delegation chains and normal credentials in them, cedar policy should run on both
//  authorizedClaims, root and tail issuers for single credentials can all come from the credential
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
import { authorize } from './cedar-auth.js';
import { collectAuthorizedClaims } from './claim-deduction.js';
import { VC_VC, VC_ISSUER } from './constants.js';
import { summarizeDelegationChain } from './summarize.js';

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
  policies,
  resourceId: overrideResourceId,
  actionId = 'Verify',
  principalId,
  failOnUnauthorizedClaims = true,
}) {
  try {
    if (!expandedPresentation) {
      throw new Error('verifyVPWithDelegation requires an expanded presentation');
    }

    const presentationNode = extractExpandedPresentationNode(expandedPresentation);
    const presentationSigner = extractExpandedVerificationMethod(presentationNode, principalId);

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

    const evaluateChain = (chain) => {
      const rootCredentialId = chain[0]?.id;
      const summary = summarizeDelegationChain(chain.map((chainItem) => chainItem.expandedNode));
      const resourceId = overrideResourceId ?? summary.resourceId;
      const resolvedPrincipalId = principalId ?? presentationSigner;
      const authorizedGraphId = rootCredentialId ? `urn:authorized:${rootCredentialId}` : 'urn:authorized';

      if (!actionId) {
        throw new Error('Missing actionId');
      }
      if (!resolvedPrincipalId) {
        throw new Error('Principal id must be provided for authorization');
      }

      const facts = {
        ...summary,
        resourceId,
        actionIds: ['Verify'],
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

      const decision = policies ? authorize({
        policies,
        principalId: resolvedPrincipalId,
        actionId,
        resourceId,
        vpSignerId: presentationSigner,
        entities,
        rootTypes: summary.rootTypes,
        // rootClaims: summary.rootClaims,
        rootIssuerId: summary.rootIssuerId,
        tailTypes: summary.tailTypes,
        // tailClaims: summary.tailClaims,
        tailIssuerId: summary.tailIssuerId,
        tailDepth: summary.tailDepth,
        authorizedClaims: authorizedClaimUnion,
        authorizedClaimsBySubject: authorizedPerSubject,
      }) : 'allow';

      return {
        decision, summary, facts, entities,
      };
    };

    for (const tail of tailCredentials) {
      const chain = buildChain(tail.id);
      if (!chain) {
        continue;
      }
      const {
        decision, summary, facts, entities,
      } = evaluateChain(chain);
      if (decision !== 'allow') {
        return {
          decision,
          failures: [],
          summary,
          summaries: [summary],
          facts,
          entities,
        };
      }
      summaries.push(summary);
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
    };
  } catch (error) {
    return {
      decision: 'deny',
      failures: [normalizeFailure(error)],
      summary: null,
      facts: null,
      entities: null,
    };
  }
}
