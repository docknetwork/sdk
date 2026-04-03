import jsonld from 'jsonld';
import base64url from 'base64url';

import {
  shortenTerm,
  firstExpandedValue,
  findExpandedTermId,
  normalizeSubject,
} from '../jsonld-utils.js';
import { firstArrayItem, toArray } from '../utils.js';
import {
  VC_ISSUER,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
  VC_DELEGATION_POLICY_ID,
  VC_DELEGATION_POLICY_DIGEST,
  VC_DELEGATION_ROLE_ID,
  VC_ISSUANCE_DATE,
  VC_EXPIRATION_DATE,
  UNKNOWN_IDENTIFIER,
} from '../constants.js';
import { DelegationError, DelegationErrorCodes } from '../errors.js';
import { DELEGATION_TYPE_NAME, VC_JWT_ID_PREFIX, VC_JWT_PATTERN } from './engine-constants.js';

function ensureSubjectId(subject, fallbackId) {
  if (!subject || typeof subject !== 'object' || subject.id) {
    return subject;
  }
  if (fallbackId) {
    return { ...subject, id: fallbackId };
  }
  return subject;
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

function parseJwtPayloadParts(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'Malformed VC-JWT encountered in presentation',
    );
  }
  try {
    return JSON.parse(base64url.decode(parts[1]));
  } catch {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'Unable to decode VC-JWT payload',
    );
  }
}

function normalizeJwtCredentialSubject(credentialSubject, subjectId) {
  if (!credentialSubject) {
    return subjectId ? { id: subjectId } : {};
  }
  if (Array.isArray(credentialSubject)) {
    return credentialSubject.map((subject) => ensureSubjectId(subject, subjectId));
  }
  return ensureSubjectId(credentialSubject, subjectId);
}

function buildJwtSkipOutcome(normalizedCredential, payload, subjectId) {
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

function ensureJwtContextAndTypeArrays(normalizedCredential) {
  const next = { ...normalizedCredential };
  if (!Array.isArray(next['@context'])) {
    next['@context'] = [next['@context']];
  }
  if (!next.type) {
    next.type = ['VerifiableCredential'];
  } else if (!Array.isArray(next.type)) {
    next.type = [next.type];
  }
  return next;
}

async function expandJwtCredential(jwt, index, documentLoader) {
  const payload = parseJwtPayloadParts(jwt);
  const credential = payload?.vc;
  if (!credential || typeof credential !== 'object') {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      'VC-JWT payload missing vc object',
    );
  }

  const normalizedCredential = {
    ...credential,
    id: credential.id ?? payload?.jti ?? `${VC_JWT_ID_PREFIX}${index}`,
    credentialSubject: normalizeJwtCredentialSubject(credential.credentialSubject, payload?.sub),
  };
  if (!normalizedCredential.issuer && payload?.iss) {
    normalizedCredential.issuer = payload.iss;
  }

  const hasJsonLdContext = Array.isArray(normalizedCredential['@context'])
    || typeof normalizedCredential['@context'] === 'string';
  if (!hasJsonLdContext) {
    return buildJwtSkipOutcome(normalizedCredential, payload, payload?.sub);
  }

  const forExpand = ensureJwtContextAndTypeArrays(normalizedCredential);
  const loader = documentLoader ?? jsonld.documentLoaders?.node?.();
  const expandOptions = loader ? { documentLoader: loader } : {};
  const expanded = await jsonld.expand(forExpand, expandOptions);
  const credentialNode = firstArrayItem(
    expanded,
    'Expanded VC-JWT credential missing node',
  );

  return {
    kind: 'expanded',
    credentialNode,
    contextOverride: forExpand['@context'],
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

function buildCompactCredentialRecord(credentialNode, credentialSubject) {
  const credentialId = credentialNode?.['@id'];
  return {
    id: credentialId,
    type: toArray(credentialNode['@type']).map((value) => shortenTerm(value)),
    issuer: firstExpandedValue(credentialNode[VC_ISSUER]),
    previousCredentialId: findExpandedTermId(credentialNode, VC_PREVIOUS_CREDENTIAL_ID),
    rootCredentialId: findExpandedTermId(credentialNode, VC_ROOT_CREDENTIAL_ID),
    credentialSubject,
    delegationPolicyId: findExpandedTermId(credentialNode, VC_DELEGATION_POLICY_ID),
    delegationPolicyDigest: findExpandedTermId(credentialNode, VC_DELEGATION_POLICY_DIGEST),
    delegationRoleId: findExpandedTermId(credentialNode, VC_DELEGATION_ROLE_ID),
    issuanceDate: findExpandedTermId(credentialNode, VC_ISSUANCE_DATE),
    expirationDate: findExpandedTermId(credentialNode, VC_EXPIRATION_DATE),
    expandedNode: credentialNode,
  };
}

async function compactCredentialFromNode(credentialNode, context, documentLoader) {
  const compactOptions = documentLoader ? { documentLoader } : undefined;
  const compacted = await jsonld.compact(
    credentialNode,
    { '@context': context },
    compactOptions,
  );
  return normalizeSubject(compacted?.credentialSubject);
}

async function ingestOnePresentationCredential(entry, index, {
  normalizedById,
  referencedPreviousIds,
  contexts,
  documentLoader,
  skippedCredentialIds,
  skippedCredentials,
}) {
  const normalizedEntry = await normalizeCredentialEntry(entry, index, { documentLoader });
  if (normalizedEntry?.skipped) {
    const { skipped } = normalizedEntry;
    skippedCredentialIds.add(skipped.credentialId);
    skippedCredentials.push(skipped);
    return;
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
  const credentialSubject = await compactCredentialFromNode(credentialNode, context, documentLoader);
  const credential = buildCompactCredentialRecord(credentialNode, credentialSubject);
  normalizedById.set(credentialId, credential);
  const prevId = credential.previousCredentialId;
  if (typeof prevId === 'string' && prevId.length > 0) {
    referencedPreviousIds.add(prevId);
  }
}

export async function ingestAllPresentationCredentials(vcEntries, ingestCtx) {
  const normalizedById = new Map();
  const referencedPreviousIds = new Set();
  for (let index = 0; index < vcEntries.length; index += 1) {
    const entry = vcEntries[index];
    // eslint-disable-next-line no-await-in-loop
    await ingestOnePresentationCredential(entry, index, {
      ...ingestCtx,
      normalizedById,
      referencedPreviousIds,
    });
  }
  return { normalizedById, referencedPreviousIds };
}

export function assertDelegationReferencesResolved(credential, normalizedById) {
  const {
    id, previousCredentialId, rootCredentialId, type,
  } = credential;
  const isDelegationCredential = Array.isArray(type) && type.includes(DELEGATION_TYPE_NAME);
  if (!isDelegationCredential) {
    return;
  }
  if (previousCredentialId && !normalizedById.has(previousCredentialId)) {
    throw new DelegationError(
      DelegationErrorCodes.MISSING_CREDENTIAL,
      `Missing credential ${previousCredentialId} referenced as previous by ${id}`,
    );
  }
  if (!rootCredentialId || typeof rootCredentialId !== 'string' || rootCredentialId.length === 0) {
    throw new DelegationError(
      DelegationErrorCodes.INVALID_CREDENTIAL,
      `Delegation credential ${id} is missing rootCredentialId`,
    );
  }
  if (!normalizedById.has(rootCredentialId)) {
    throw new DelegationError(
      DelegationErrorCodes.MISSING_CREDENTIAL,
      `Missing root credential ${rootCredentialId} referenced by ${id}`,
    );
  }
}
