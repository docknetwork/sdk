/* eslint-disable sonarjs/cognitive-complexity */
import jsonld from 'jsonld';
import { infer } from 'rify';
import base64url from 'base64url';

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
import {
  VC_VC,
  VC_NS,
  VC_ISSUER,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
  VC_TYPE_DELEGATION_CREDENTIAL,
  ACTION_VERIFY,
  UNKNOWN_IDENTIFIER,
} from './constants.js';
import { summarizeDelegationChain, summarizeStandaloneCredential } from './summarize.js';
import { DelegationError, DelegationErrorCodes, normalizeDelegationFailure } from './errors.js';

const CONTROL_PREDICATES = new Set(['allows', 'delegatesTo', 'listsClaim', 'inheritsParent']);
const RESERVED_RESOURCE_TYPES = new Set([
  `${VC_NS}VerifiableCredential`,
  'VerifiableCredential',
  VC_TYPE_DELEGATION_CREDENTIAL,
  'DelegationCredential',
]);
const VC_JWT_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
const VC_JWT_ID_PREFIX = 'urn:vcjwt:';
const AUTHORIZED_GRAPH_PREFIX = 'urn:authorized';

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

function ensureSubjectId(subject, fallbackId) {
  if (!subject || typeof subject !== 'object' || subject.id) {
    return subject;
  }
  if (fallbackId) {
    return { ...subject, id: fallbackId };
  }
  return subject;
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

function resolveCredentialContext(credentialId, contexts, contextOverride) {
  const context = contexts.get(credentialId) ?? contextOverride;
  if (!context) {
    throw new DelegationError(
      DelegationErrorCodes.MISSING_CONTEXT,
      `Missing compaction context for credential ${credentialId}`,
    );
  }
  return context;
}

function createSkippedCredential({
  credentialId = UNKNOWN_IDENTIFIER,
  issuerId = UNKNOWN_IDENTIFIER,
  subjectId = UNKNOWN_IDENTIFIER,
  types = [],
  claims = {},
}) {
  return {
    credentialId,
    issuerId,
    subjectId,
    types: toArray(types).filter(Boolean),
    claims,
  };
}

async function expandJwtCredential(jwt, index, documentLoader) {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'Malformed VC-JWT encountered in presentation',
    );
  }

  let payload;
  try {
    payload = JSON.parse(base64url.decode(parts[1]));
  } catch (error) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'Unable to decode VC-JWT payload',
    );
  }

  const credential = payload?.vc;
  if (!credential || typeof credential !== 'object') {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'VC-JWT payload missing vc object',
    );
  }

  const normalizedCredential = { ...credential };
  normalizedCredential.id = normalizedCredential.id ?? payload?.jti ?? `${VC_JWT_ID_PREFIX}${index}`;
  const subjectId = payload?.sub;
  if (!normalizedCredential.credentialSubject) {
    normalizedCredential.credentialSubject = subjectId ? { id: subjectId } : {};
  } else if (Array.isArray(normalizedCredential.credentialSubject)) {
    normalizedCredential.credentialSubject = normalizedCredential.credentialSubject.map(
      (subject) => ensureSubjectId(subject, subjectId),
    );
  } else {
    normalizedCredential.credentialSubject = ensureSubjectId(
      normalizedCredential.credentialSubject,
      subjectId,
    );
  }

  if (!normalizedCredential.issuer && payload?.iss) {
    normalizedCredential.issuer = payload.iss;
  }

  const hasJsonLdContext = Array.isArray(normalizedCredential['@context'])
    || typeof normalizedCredential['@context'] === 'string';
  if (!hasJsonLdContext) {
    return {
      kind: 'skipped',
      metadata: {
        credentialId: normalizedCredential.id,
        claims: normalizedCredential.credentialSubject ?? {},
        issuerId: normalizedCredential.issuer ?? payload?.iss ?? UNKNOWN_IDENTIFIER,
        subjectId: normalizedCredential.credentialSubject?.id ?? subjectId ?? UNKNOWN_IDENTIFIER,
        types: toArray(normalizedCredential.type),
      },
    };
  }
  if (!Array.isArray(normalizedCredential['@context'])) {
    normalizedCredential['@context'] = [normalizedCredential['@context']];
  }

  if (!normalizedCredential.type) {
    normalizedCredential.type = ['VerifiableCredential'];
  } else if (!Array.isArray(normalizedCredential.type)) {
    normalizedCredential.type = [normalizedCredential.type];
  }

  const loader = documentLoader ?? jsonld.documentLoaders?.node?.();
  const expandOptions = loader ? { documentLoader: loader } : {};
  const expanded = await jsonld.expand(normalizedCredential, expandOptions);
  const credentialNode = firstArrayItem(
    expanded,
    'Expanded VC-JWT credential missing node',
  );

  return {
    kind: 'expanded',
    credentialNode,
    contextOverride: normalizedCredential['@context'],
  };
}

async function normalizeJwtEntry(value, index, documentLoader) {
  const outcome = await expandJwtCredential(value, index, documentLoader);
  if (outcome.kind === 'skipped') {
    return { skipped: createSkippedCredential(outcome.metadata) };
  }
  return {
    credentialNode: outcome.credentialNode,
    contextOverride: outcome.contextOverride,
  };
}

async function normalizeCredentialEntry(entry, index, { documentLoader }) {
  if (Array.isArray(entry?.['@graph'])) {
    const credentialNode = firstArrayItem(
      entry['@graph'],
      'Expanded verifiableCredential entry is missing @graph node',
    );
    const referenceId = credentialNode?.['@id'];
    const onlyHasId = referenceId
      && Object.keys(credentialNode).every((key) => key === '@id');
    if (onlyHasId && VC_JWT_PATTERN.test(referenceId)) {
      return normalizeJwtEntry(referenceId, index, documentLoader);
    }
    return {
      credentialNode,
      contextOverride: null,
    };
  }

  const literalValue = entry?.['@value'];
  if (typeof literalValue === 'string' && VC_JWT_PATTERN.test(literalValue)) {
    return normalizeJwtEntry(literalValue, index, documentLoader);
  }

  const referenceId = entry?.['@id'];
  if (typeof referenceId === 'string' && VC_JWT_PATTERN.test(referenceId)) {
    return normalizeJwtEntry(referenceId, index, documentLoader);
  }

  throw new DelegationError(
    DelegationErrorCodes.INVALID_CREDENTIAL,
    'Unsupported credential entry encountered in presentation',
  );
}

// Normalizes thrown errors into a consistent failure record.
function normalizeFailure(error) {
  return normalizeDelegationFailure(error);
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

// High-level helper: parse VP, build entities, and return decision plus failures.
/**
 * @param {Object} options
 * @param {any[]} options.expandedPresentation
 * @param {Map<string, any>|Object} options.credentialContexts
 * @param {boolean} [options.failOnUnauthorizedClaims=false]
 * @param {Function} [options.documentLoader]
 * @returns {Promise<VerifyDelegationResult>}
 */
export async function verifyVPWithDelegation({
  expandedPresentation,
  credentialContexts,
  failOnUnauthorizedClaims = false,
  documentLoader,
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

    const normalizedById = new Map();
    const contexts = normalizeContextMap(credentialContexts);
    const referencedPreviousIds = new Set();
    const vcEntries = presentationNode[VC_VC] ?? [];

    for (let index = 0; index < vcEntries.length; index += 1) {
      const entry = vcEntries[index];
      // eslint-disable-next-line no-await-in-loop
      const normalizedEntry = await normalizeCredentialEntry(
        entry,
        index,
        { documentLoader },
      );
      if (normalizedEntry?.skipped) {
        const { skipped } = normalizedEntry;
        skippedCredentialIds.add(skipped.credentialId);
        skippedCredentials.push(skipped);
        // eslint-disable-next-line no-continue
        continue;
      }
      const { credentialNode, contextOverride } = normalizedEntry;
      const credentialId = credentialNode?.['@id'];
      if (typeof credentialId !== 'string' || credentialId.length === 0) {
        throw new DelegationError(
          DelegationErrorCodes.INVALID_CREDENTIAL,
          'Expanded credential node must include an @id',
        );
      }

      const context = resolveCredentialContext(credentialId, contexts, contextOverride);

      const compactOptions = documentLoader ? { documentLoader } : undefined;
      // eslint-disable-next-line no-await-in-loop
      const compacted = await jsonld.compact(credentialNode, { '@context': context }, compactOptions);
      const credentialSubject = normalizeSubject(compacted?.credentialSubject);

      const credential = {
        id: credentialId,
        type: toArray(credentialNode['@type']).map((value) => shortenTerm(value)),
        issuer: firstExpandedValue(credentialNode[VC_ISSUER]),
        previousCredentialId: findExpandedTermId(credentialNode, VC_PREVIOUS_CREDENTIAL_ID),
        rootCredentialId: findExpandedTermId(credentialNode, VC_ROOT_CREDENTIAL_ID),
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

    const buildChain = (tailId) => {
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
    };

    const evaluateChain = async (chain) => {
      const rootCredentialId = chain[0]?.id;
      const hasDelegationLinks = chain.some(
        (vc) => typeof vc.previousCredentialId === 'string' && vc.previousCredentialId.length > 0,
      );
      const summary = hasDelegationLinks
        ? summarizeDelegationChain(chain.map((chainItem) => chainItem.expandedNode))
        : summarizeStandaloneCredential(chain[chain.length - 1]);
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

      const premises = buildRifyPremisesFromChain(chain, rootCredentialId);
      if (!Array.isArray(premises) || premises.some((quad) => quad.length !== 4)) {
        throw new DelegationError(
          DelegationErrorCodes.RIFY_FAILURE,
          'Invalid premises generated for rify inference',
        );
      }
      const rules = buildRifyRules(rootCredentialId, authorizedGraphId);
      let derived;
      try {
        derived = infer(premises, rules);
      } catch (error) {
        throw new DelegationError(
          DelegationErrorCodes.RIFY_FAILURE,
          `rify inference failed: ${error.message ?? error}`,
        );
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
        throw new DelegationError(
          DelegationErrorCodes.UNAUTHORIZED_CLAIM,
          `Unauthorized claims detected in delegation chain${details ? `: ${details}` : ''}`,
        );
      }

      facts.authorizedClaims = authorizedClaimUnion;
      facts.authorizedClaimsBySubject = authorizedPerSubject;
      facts.resourceTypes = resourceTypes;
      const parentCredential = chain.length > 1 ? chain[chain.length - 2] : null;
      facts.parentClaims = parentClaimsChain ?? parentCredential?.credentialSubject ?? {};
      summary.authorizedClaims = authorizedClaimUnion;
      summary.authorizedClaimsBySubject = authorizedPerSubject;
      summary.resourceTypes = resourceTypes;
      summary.rootClaims = rootClaims;
      summary.tailClaims = tailClaims;
      summary.parentClaims = parentClaimsChain;
      summary.tailClaims = tailClaims;

      return {
        summary,
        facts,
        entities,
        chain,
        premises,
        derived,
        authorizedClaims: authorizedClaimUnion,
        authorizedClaimsBySubject: authorizedPerSubject,
        resourceTypes,
      };
    };

    for (const tail of tailCredentials) {
      const chain = buildChain(tail.id);
      if (!chain) {
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
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
