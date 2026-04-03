import { infer } from 'rify';

import { baseEntities, collectActorIds, applyCredentialFacts } from '../cedar-utils.js';
import { toArray } from '../utils.js';
import { buildRifyPremisesFromChain, buildRifyRules } from '../rify-helpers.js';
import { collectAuthorizedClaims } from '../claim-deduction.js';
import { ACTION_VERIFY } from '../constants.js';
import {
  assertDelegationPolicyRootPlacement,
  extractRootPolicyBinding,
  resolveAndVerifyDelegationPolicy,
} from '../delegation-policy-chain.js';
import { summarizeDelegationChain, summarizeStandaloneCredential } from '../summarize.js';
import { DelegationError, DelegationErrorCodes } from '../errors.js';
import {
  AUTHORIZED_GRAPH_PREFIX,
  CONTROL_PREDICATES,
  RESERVED_RESOURCE_TYPES,
} from './engine-constants.js';

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
      remainingPremises.set(key, {
        subject, claim: predicate, value, issuer: graph,
      });
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

function normalizeScopeClaims(subject = {}) {
  if (!subject || typeof subject !== 'object') {
    return subject ?? {};
  }
  const normalized = { ...subject };
  if (Object.prototype.hasOwnProperty.call(normalized, 'permittedSystems')) {
    normalized.permittedSystems = toArray(normalized.permittedSystems ?? []);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'contractTypes')) {
    normalized.contractTypes = toArray(normalized.contractTypes ?? []);
  }
  return normalized;
}

function buildParentClaimsChain(chain) {
  if (!Array.isArray(chain) || chain.length < 2) {
    return null;
  }
  const orderedSegments = [];
  for (let index = chain.length - 2; index >= 0; index -= 1) {
    const subjectClaims = normalizeScopeClaims(chain[index]?.credentialSubject);
    if (subjectClaims && typeof subjectClaims === 'object') {
      orderedSegments.push(subjectClaims);
    }
  }
  let head = null;
  let previousNode = null;
  orderedSegments.forEach((claims) => {
    const node = { ...claims };
    if (!head) {
      head = node;
    }
    if (previousNode) {
      previousNode.parentClaims = node;
    }
    previousNode = node;
  });
  return head;
}

function deriveResourceTypesFromChain(chain) {
  const root = chain[0];
  if (!root || !Array.isArray(root.type)) {
    return [];
  }
  const filtered = root.type.filter(
    (typeName) => typeof typeName === 'string' && !RESERVED_RESOURCE_TYPES.has(typeName),
  );
  return filtered.length > 0 ? filtered : [];
}

export function buildCredentialChainFromTail(normalizedById, tailId, seenChains) {
  if (seenChains.has(tailId)) {
    return null;
  }
  const chain = [];
  const visited = new Set();
  let current = normalizedById.get(tailId);
  if (!current) {
    throw new DelegationError(
      DelegationErrorCodes.MISSING_CREDENTIAL,
      `Tail credential ${tailId} not found in presentation`,
    );
  }
  while (current) {
    if (visited.has(current.id)) {
      throw new DelegationError(
        DelegationErrorCodes.CHAIN_CYCLE,
        'Delegation chain contains a cycle',
      );
    }
    visited.add(current.id);
    chain.unshift(current);
    const prevId = current.previousCredentialId;
    if (!prevId) {
      break;
    }
    current = normalizedById.get(prevId);
    if (!current) {
      throw new DelegationError(
        DelegationErrorCodes.MISSING_CREDENTIAL,
        `Missing credential ${prevId} referenced by ${chain[0].id}`,
      );
    }
  }
  seenChains.add(tailId);
  return chain;
}

async function resolveDelegationPolicyForChain(chain, binding, delegationPolicy, documentLoader) {
  if (!binding.hasPolicy || delegationPolicy?.enabled === false) {
    return;
  }
  if (typeof documentLoader !== 'function') {
    throw new DelegationError(
      DelegationErrorCodes.POLICY_DOCUMENT_LOADER_REQUIRED,
      'documentLoader is required to fetch the delegation policy document when credentials include delegationPolicyId and delegationPolicyDigest',
    );
  }
  await resolveAndVerifyDelegationPolicy({
    chain,
    rootPolicyId: binding.rootPolicyId,
    rootPolicyDigest: binding.rootPolicyDigest,
    documentLoader,
  });
}

function summarizeNormalizedChain(chain) {
  const hasDelegationLinks = chain.some(
    (vc) => typeof vc.previousCredentialId === 'string' && vc.previousCredentialId.length > 0,
  );
  return hasDelegationLinks
    ? summarizeDelegationChain(chain.map((chainItem) => chainItem.expandedNode))
    : summarizeStandaloneCredential(chain[chain.length - 1]);
}

function runRifyOnChain(chain, rootCredentialId, authorizedGraphId) {
  const premises = buildRifyPremisesFromChain(chain, rootCredentialId);
  if (!Array.isArray(premises) || premises.some((quad) => quad.length !== 4)) {
    throw new DelegationError(
      DelegationErrorCodes.RIFY_FAILURE,
      'Invalid premises generated for rify inference',
    );
  }
  const rules = buildRifyRules(rootCredentialId, authorizedGraphId);
  try {
    const derived = infer(premises, rules);
    return { premises, derived };
  } catch (error) {
    throw new DelegationError(
      DelegationErrorCodes.RIFY_FAILURE,
      `rify inference failed: ${error.message ?? error}`,
    );
  }
}

function assertAuthorizedClaimsAllowed(premises, derived, authorizedGraphId, failOnUnauthorizedClaims) {
  const unauthorizedClaims = findUnauthorizedClaims(premises, derived, authorizedGraphId);
  if (unauthorizedClaims.length === 0 || !failOnUnauthorizedClaims) {
    return;
  }
  const details = unauthorizedClaims
    .slice(0, 5)
    .map((claim) => `${claim.subject}.${claim.claim}`)
    .join(', ');
  throw new DelegationError(
    DelegationErrorCodes.UNAUTHORIZED_CLAIM,
    `Unauthorized claims detected in delegation chain${details ? `: ${details}` : ''}`,
  );
}

function extendFactsAndSummaryAfterInference({
  summary,
  facts,
  authorizedClaimUnion,
  authorizedPerSubject,
  resourceTypes,
  rootClaims,
  tailClaims,
  parentClaimsChain,
  chain,
}) {
  const parentCredential = chain.length > 1 ? chain[chain.length - 2] : null;
  return {
    facts: {
      ...facts,
      authorizedClaims: authorizedClaimUnion,
      authorizedClaimsBySubject: authorizedPerSubject,
      resourceTypes,
      parentClaims: parentClaimsChain ?? parentCredential?.credentialSubject ?? {},
    },
    summary: {
      ...summary,
      authorizedClaims: authorizedClaimUnion,
      authorizedClaimsBySubject: authorizedPerSubject,
      resourceTypes,
      rootClaims,
      tailClaims,
      parentClaims: parentClaimsChain,
    },
  };
}

export async function evaluateDelegationChainForPresentation({
  chain,
  delegationPolicy,
  documentLoader,
  failOnUnauthorizedClaims,
  normalizedCredentials,
  presentationSigner,
}) {
  assertDelegationPolicyRootPlacement(chain);
  const binding = extractRootPolicyBinding(chain);
  await resolveDelegationPolicyForChain(chain, binding, delegationPolicy, documentLoader);

  const rootCredentialId = chain[0]?.id;
  const summary = summarizeNormalizedChain(chain);
  const { resourceId } = summary;
  const resolvedPrincipalId = presentationSigner;
  const authorizedGraphId = rootCredentialId
    ? `${AUTHORIZED_GRAPH_PREFIX}:${rootCredentialId}`
    : AUTHORIZED_GRAPH_PREFIX;
  const resourceTypes = deriveResourceTypesFromChain(chain);

  const rootCredential = chain[0];
  const tailCredential = chain[chain.length - 1];
  const rootClaims = normalizeScopeClaims(rootCredential?.credentialSubject ?? {});
  const tailClaims = normalizeScopeClaims(tailCredential?.credentialSubject ?? {});
  const parentClaimsChain = buildParentClaimsChain(chain);
  const facts = {
    ...summary,
    resourceId,
    actionIds: [ACTION_VERIFY],
    principalId: resolvedPrincipalId,
    presentationSigner,
    resourceTypes,
    rootClaims,
    tailClaims,
    parentClaims: parentClaimsChain,
  };
  const actorIds = collectActorIds(chain, presentationSigner);
  const entities = baseEntities(actorIds, facts.actionIds);
  applyCredentialFacts(entities, facts);

  const { premises, derived } = runRifyOnChain(chain, rootCredentialId, authorizedGraphId);

  const { union: authorizedClaimUnion, perSubject: authorizedPerSubject } = collectAuthorizedClaims(
    chain,
    derived,
    authorizedGraphId,
    normalizedCredentials,
  );

  assertAuthorizedClaimsAllowed(premises, derived, authorizedGraphId, failOnUnauthorizedClaims);

  const { facts: factsOut, summary: summaryOut } = extendFactsAndSummaryAfterInference({
    summary,
    facts,
    authorizedClaimUnion,
    authorizedPerSubject,
    resourceTypes,
    rootClaims,
    tailClaims,
    parentClaimsChain,
    chain,
  });

  return {
    summary: summaryOut,
    facts: factsOut,
    entities,
    chain,
    premises,
    derived,
    authorizedClaims: authorizedClaimUnion,
    authorizedClaimsBySubject: authorizedPerSubject,
    resourceTypes,
  };
}
