// TODOs:
// Make cedar policies optional, and split from this file
// Have this file focus on claim deduction and chain validation, returning authorized claims
// After splitting cedar logic, test that it works without credential delegation too. We would run cedar policy check per credential in a VP (like per delegation chain)
// Support presentations that have delegation chains and normal credentials in them, cedar policy should run on both
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
  matchesType,
} from './jsonld-utils.js';
import { baseEntities, collectActorIds, applyCredentialFacts } from './cedar-utils.js';
import { extractMayClaims, firstArrayItem, toArray } from './utils.js';
import { buildRifyPremisesFromChain, buildRifyRules } from './rify-helpers.js';
import { authorize } from './cedar-auth.js';
import { collectAuthorizedClaims } from './claim-deduction.js';
import { VC_VC, VC_ISSUER } from './constants.js';

// Normalizes thrown errors into a consistent failure record.
function normalizeFailure(error, { code = 'CHAIN_VALIDATION_ERROR' } = {}) {
  if (!error) {
    return { code, message: 'Unknown error' };
  }
  if (error.code && error.message) {
    return { code: error.code, message: error.message };
  }
  return { code, message: error.message ?? String(error) };
}

// Derives delegation-chain facts (root/tail info, depth, mayClaim, etc.) from a VP.
export function summarizePresentation(vp) {
  const credentials = Array.isArray(vp?.verifiableCredential)
    ? vp.verifiableCredential
    : [];
  if (credentials.length === 0) {
    throw new Error('Presentation must include credentials');
  }

  const credentialMap = new Map();
  credentials.forEach((vc) => {
    if (typeof vc.id !== 'string' || vc.id.length === 0) {
      throw new Error('Each credential must include a non-empty string id');
    }
    credentialMap.set(vc.id, vc);
  });

  const referencedPreviousIds = new Set();
  credentials.forEach((vc) => {
    const prevId = vc.previousCredentialId;
    if (typeof prevId === 'string' && prevId.length > 0) {
      referencedPreviousIds.add(prevId);
    }
  });

  const tailCandidates = credentials.filter((vc) => !referencedPreviousIds.has(vc.id));
  if (tailCandidates.length === 0) {
    throw new Error('Unable to determine tail credential');
  }
  if (tailCandidates.length > 1) {
    throw new Error('Unable to determine unique tail credential');
  }

  const tailCredential = tailCandidates[0];

  if (typeof tailCredential.previousCredentialId !== 'string') {
    throw new Error('Tail credential must include previousCredentialId');
  }

  const resourceId = tailCredential.id;
  if (typeof tailCredential.issuer !== 'string' || tailCredential.issuer.length === 0) {
    throw new Error('Tail credential must include a string issuer');
  }

  const chain = [];
  const visited = new Set();
  let current = tailCredential;

  while (current) {
    if (visited.has(current.id)) {
      throw new Error('Credential chain contains a cycle');
    }
    visited.add(current.id);
    chain.unshift(current);
    const prevId = current.previousCredentialId;
    if (!prevId) {
      break;
    }
    const prev = credentialMap.get(prevId);
    if (!prev) {
      throw new Error(`Missing credential in chain: ${prevId}`);
    }
    current = prev;
  }

  for (let i = 1; i < chain.length; i += 1) {
    const parent = chain[i - 1];
    const child = chain[i];
    const parentDelegate = parent.credentialSubject?.id;
    if (typeof parentDelegate !== 'string' || parentDelegate.length === 0) {
      throw new Error(`Credential ${parent.id} missing credentialSubject.id for delegation binding`);
    }
    if (child.issuer !== parentDelegate) {
      throw new Error(
        `Credential ${child.id} issuer ${child.issuer ?? 'undefined'} does not match parent delegate ${parentDelegate}`,
      );
    }
  }

  const rootCredential = chain[0];
  const expectedRootId = rootCredential.id;
  const rootDeclaredId = rootCredential.rootCredentialId;
  if (rootDeclaredId && rootDeclaredId !== expectedRootId) {
    throw new Error(
      `Root credential ${rootCredential.id} must declare rootCredentialId equal to its own id`,
    );
  }

  chain.slice(1).forEach((vc) => {
    const declaredRootId = vc.rootCredentialId;
    if (typeof declaredRootId !== 'string' || declaredRootId.length === 0) {
      throw new Error(
        `Credential ${vc.id} must include rootCredentialId referencing ${expectedRootId}`,
      );
    }
    if (declaredRootId !== expectedRootId) {
      throw new Error(
        `Credential ${vc.id} rootCredentialId ${declaredRootId} does not match root ${expectedRootId}`,
      );
    }
  });

  if (!matchesType(rootCredential, 'DelegationCredential')) {
    throw new Error('Root credential must be a DelegationCredential');
  }

  const rootIssuerId = rootCredential.issuer;
  if (typeof rootIssuerId !== 'string' || rootIssuerId.length === 0) {
    throw new Error('Root credential must include a string issuer');
  }

  const rootTypes = Array.isArray(rootCredential.type)
    ? rootCredential.type
    : typeof rootCredential.type === 'string'
      ? [rootCredential.type]
      : [];

  const rootClaims = rootCredential.credentialSubject ?? {};
  const rootMayClaims = extractMayClaims(rootClaims);

  const depthByActor = new Map([[rootIssuerId, 0]]);
  const allowedClaimsByActor = new Map();
  const delegations = [];
  const registeredDelegations = new Set();

  const registerDelegation = (principalId, depth) => {
    if (typeof principalId !== 'string' || principalId.length === 0) {
      return;
    }
    if (registeredDelegations.has(principalId)) {
      return;
    }
    registeredDelegations.add(principalId);
    delegations.push({ principalId, depth, actions: ['Verify'] });
  };

  const rootDelegateId = rootCredential.credentialSubject?.id;
  if (typeof rootDelegateId === 'string' && rootDelegateId.length > 0) {
    registerDelegation(rootDelegateId, 1);
    allowedClaimsByActor.set(rootDelegateId, new Set(rootMayClaims));
    depthByActor.set(rootDelegateId, 1);
  }

  const delegationCredentialsInChain = [];

  chain.forEach((vc) => {
    if (!matchesType(vc, 'DelegationCredential')) {
      return;
    }

    delegationCredentialsInChain.push(vc);

    const delegator = vc.issuer;
    const delegate = vc.credentialSubject?.id;
    if (typeof delegate !== 'string' || delegate.length === 0) {
      return;
    }

    const parentDepth = depthByActor.get(delegator) ?? 0;
    const depth = parentDepth + 1;
    depthByActor.set(delegate, depth);
    registerDelegation(delegate, depth);
  });

  const tailTypes = Array.isArray(tailCredential.type)
    ? tailCredential.type
    : typeof tailCredential.type === 'string'
      ? [tailCredential.type]
      : [];
  const tailSubject = tailCredential.credentialSubject ?? {};
  const tailDelegateId = tailSubject.id;
  if (typeof tailDelegateId !== 'string' || tailDelegateId.length === 0) {
    throw new Error('Tail credential must include a subject id');
  }

  const tailIssuerId = tailCredential.issuer;
  if (typeof tailIssuerId !== 'string' || tailIssuerId.length === 0) {
    throw new Error('Tail credential must include a string issuer');
  }

  const tailDepth = depthByActor.get(tailIssuerId) ?? delegationCredentialsInChain.length;
  registerDelegation(tailDelegateId, tailDepth);

  return {
    resourceId,
    delegations,
    rootTypes,
    rootClaims,
    rootIssuerId,
    tailTypes,
    tailClaims: tailSubject,
    tailIssuerId,
    tailDepth,
  };
}

// High-level helper: parse VP, build entities, run Cedar, and return decision plus failures.
export async function verifyVPWithDelegation({
  expandedPresentation,
  credentialContexts,
  policies,
  resourceId: overrideResourceId,
  actionId = 'Verify',
  principalId,
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
      const summary = summarizePresentation({ verifiableCredential: chain });
      const resourceId = overrideResourceId ?? summary.resourceId;
      const resolvedPrincipalId = principalId ?? presentationSigner;
      const rootCredentialId = chain[0]?.id;
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

      // TODO: check with derived vs premises to see UNAUTHORIZED claims
      // if any exist, then throw error

      const { union: authorizedClaimUnion, perSubject: authorizedPerSubject } = collectAuthorizedClaims(
        chain,
        derived,
        authorizedGraphId,
        normalizedCredentials,
      );

      facts.authorizedClaims = authorizedClaimUnion;
      facts.authorizedClaimsBySubject = authorizedPerSubject;
      summary.authorizedClaims = authorizedClaimUnion;
      summary.authorizedClaimsBySubject = authorizedPerSubject;

      const decision = authorize({
        policies,
        principalId: resolvedPrincipalId,
        actionId,
        resourceId,
        vpSignerId: presentationSigner,
        entities,
        rootTypes: summary.rootTypes,
        rootClaims: summary.rootClaims,
        rootIssuerId: summary.rootIssuerId,
        tailTypes: summary.tailTypes,
        tailClaims: summary.tailClaims,
        tailIssuerId: summary.tailIssuerId,
        tailDepth: summary.tailDepth,
        authorizedClaims: authorizedClaimUnion,
        authorizedClaimsBySubject: authorizedPerSubject,
      });

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
