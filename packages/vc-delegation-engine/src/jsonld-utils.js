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
  const slashIndex = iri.lastIndexOf('/');
  if (slashIndex >= 0 && slashIndex + 1 < iri.length) {
    return iri.slice(slashIndex + 1);
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

export function normalizeSubject(compactedSubject) {
  const subjectValue = Array.isArray(compactedSubject)
    ? compactedSubject[0]
    : compactedSubject;
  if (!subjectValue || typeof subjectValue !== 'object') {
    return {};
  }

  const normalized = { ...subjectValue };
  Object.entries(normalized).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) => {
        if (item && typeof item === 'object') {
          if ('@value' in item) {
            return item['@value'];
          }
          if ('@id' in item) {
            return item['@id'];
          }
        }
        return item;
      });
      if (!MAY_CLAIM_ALIAS_KEYS.includes(key) && normalized[key].length === 1) {
        normalized[key] = normalized[key][0];
      }
    } else if (value && typeof value === 'object') {
      if ('@value' in value) {
        normalized[key] = value['@value'];
      } else if ('@id' in value) {
        normalized[key] = value['@id'];
      }
    }
  });

  const mayClaims = MAY_CLAIM_ALIAS_KEYS.map((alias) => normalized[alias]).find(
    (val) => val !== undefined,
  );
  if (mayClaims !== undefined) {
    const list = Array.isArray(mayClaims) ? mayClaims : [mayClaims];
    normalized[MAY_CLAIM_IRI] = list.map((claim) => String(claim));
    normalized.mayClaim = normalized[MAY_CLAIM_IRI];
  }

  return normalized;
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
