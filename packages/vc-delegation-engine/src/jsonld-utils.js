import {
  VC_TYPE,
  SECURITY_PROOF,
  SECURITY_VERIFICATION_METHOD,
  MAY_CLAIM_IRI,
  MAY_CLAIM_ALIAS_KEYS,
} from './constants.js';
import { firstArrayItem } from './utils.js';

export function normalizeContextMap(credentialContexts) {
  if (!credentialContexts) {
    throw new Error('Credential contexts are required for compaction');
  }
  if (credentialContexts instanceof Map) {
    return credentialContexts;
  }
  if (Array.isArray(credentialContexts)) {
    return new Map(credentialContexts);
  }
  if (typeof credentialContexts === 'object') {
    return new Map(Object.entries(credentialContexts));
  }
  throw new Error('Unsupported credentialContexts format; expected Map, array, or object');
}

export function shortenTerm(iri) {
  if (typeof iri !== 'string' || iri.length === 0) {
    return iri;
  }
  const hashIndex = iri.lastIndexOf('#');
  if (hashIndex >= 0 && hashIndex + 1 < iri.length) {
    return iri.slice(hashIndex + 1);
  }
  const colonIndex = iri.lastIndexOf(':');
  if (colonIndex >= 0 && colonIndex + 1 < iri.length) {
    return iri.slice(colonIndex + 1);
  }
  return iri;
}

export function extractExpandedPresentationNode(expanded) {
  if (!Array.isArray(expanded) || expanded.length === 0) {
    throw new Error('Expanded presentation must contain at least one node');
  }
  const node = expanded.find((entry) => Array.isArray(entry?.['@type']) && entry['@type'].includes(VC_TYPE))
    ?? expanded[0];
  if (!Array.isArray(node?.['@type']) || !node['@type'].includes(VC_TYPE)) {
    throw new Error('Expanded data does not include a VerifiablePresentation node');
  }
  return node;
}

export function extractExpandedVerificationMethod(presentationNode, fallbackSigner) {
  const proofEntries = presentationNode[SECURITY_PROOF];
  if (!Array.isArray(proofEntries) || proofEntries.length === 0) {
    return fallbackSigner;
  }

  const proofEntry = firstArrayItem(
    proofEntries,
    'Expanded presentation is missing security proof data',
  );
  const proofNode = Array.isArray(proofEntry['@graph'])
    ? firstArrayItem(proofEntry['@graph'], 'Expanded proof entry missing @graph node')
    : proofEntry;
  const verificationEntry = firstArrayItem(
    proofNode[SECURITY_VERIFICATION_METHOD],
    'Expanded proof is missing verificationMethod',
  );
  const verificationValue = verificationEntry?.['@id'] ?? verificationEntry?.['@value'];
  if (typeof verificationValue !== 'string' || verificationValue.length === 0) {
    throw new Error('Expanded verificationMethod must be a string');
  }
  return verificationValue.split('#')[0];
}

export function firstExpandedValue(entry) {
  if (Array.isArray(entry) && entry.length > 0) {
    return firstExpandedValue(entry[0]);
  }
  if (entry && typeof entry === 'object') {
    return entry['@id'] ?? entry['@value'] ?? entry;
  }
  return entry;
}

export function findExpandedTermId(node, term) {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const keys = Object.keys(node);
  for (const key of keys) {
    if (
      key === term
      || key.endsWith(`#${term}`)
      || key.endsWith(`/${term}`)
      || key.endsWith(`:${term}`)
    ) {
      return firstExpandedValue(node[key]);
    }
  }
  return undefined;
}

function mapJsonLdArrayElement(item) {
  if (item && typeof item === 'object') {
    if ('@value' in item) {
      return item['@value'];
    }
    if ('@id' in item) {
      return item['@id'];
    }
  }
  return item;
}

function unwrapJsonLdScalar(value) {
  if (value && typeof value === 'object') {
    if ('@value' in value) {
      return value['@value'];
    }
    if ('@id' in value) {
      return value['@id'];
    }
  }
  return value;
}

function normalizeSubjectFieldValue(key, value) {
  if (Array.isArray(value)) {
    const mapped = value.map(mapJsonLdArrayElement);
    if (!MAY_CLAIM_ALIAS_KEYS.includes(key) && mapped.length === 1) {
      return mapped[0];
    }
    return mapped;
  }
  return unwrapJsonLdScalar(value);
}

function withMayClaimAliasesFromNormalizedKeys(normalized) {
  const mayClaims = MAY_CLAIM_ALIAS_KEYS.map((alias) => normalized[alias]).find(
    (val) => val !== undefined,
  );
  if (mayClaims === undefined) {
    return normalized;
  }
  const list = Array.isArray(mayClaims) ? mayClaims : [mayClaims];
  const canonical = list.map((claim) => String(claim));
  return {
    ...normalized,
    [MAY_CLAIM_IRI]: canonical,
    mayClaim: canonical,
  };
}

export function normalizeSubject(compactedSubject) {
  const subjectValue = Array.isArray(compactedSubject)
    ? compactedSubject[0]
    : compactedSubject;
  if (!subjectValue || typeof subjectValue !== 'object') {
    return {};
  }

  const normalized = { ...subjectValue };
  Object.keys(normalized).forEach((key) => {
    normalized[key] = normalizeSubjectFieldValue(key, normalized[key]);
  });

  return withMayClaimAliasesFromNormalizedKeys(normalized);
}

export function matchesType(vc, typeName) {
  if (!vc) {
    return false;
  }
  const vcTypes = vc.type || vc['@type'];
  if (Array.isArray(vcTypes)) {
    return vcTypes.includes(typeName);
  }
  return vcTypes === typeName;
}

export function extractGraphId(object, property) {
  return object[property] && object[property][0] && object[property][0]['@id'];
}

export function extractGraphObject(object, property) {
  return object[property] && object[property][0];
}
