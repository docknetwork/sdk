/* eslint-disable sonarjs/cognitive-complexity */
import {
  matchesType,
  extractGraphId,
  extractGraphObject,
  findExpandedTermId,
} from './jsonld-utils.js';
import {
  VC_ISSUER,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
  VC_SUBJECT,
  VC_TYPE_DELEGATION_CREDENTIAL,
  ACTION_VERIFY,
} from './constants.js';

function normalizeTypeList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

// Derives delegation-chain facts (root/tail info, depth, mayClaim, etc.) from chain of expanded JSON-LD credentials
export function summarizeDelegationChain(credentials) {
  if (credentials.length === 0) {
    throw new Error('Chain must include credentials to summarize');
  }

  const credentialMap = new Map();
  credentials.forEach((vc) => {
    const vcId = vc['@id'];
    if (typeof vcId !== 'string' || vcId.length === 0) {
      throw new Error('Each credential must include a non-empty string id');
    }
    credentialMap.set(vcId, vc);
  });

  const referencedPreviousIds = new Set();
  credentials.forEach((vc) => {
    const prevId = findExpandedTermId(vc, VC_PREVIOUS_CREDENTIAL_ID);
    if (typeof prevId === 'string' && prevId) {
      referencedPreviousIds.add(prevId);
    }
  });

  const tailCandidates = credentials.filter((vc) => !referencedPreviousIds.has(vc['@id']));

  if (tailCandidates.length === 0) {
    throw new Error('Unable to determine tail credential');
  }
  if (tailCandidates.length > 1) {
    throw new Error('Unable to determine unique tail credential');
  }

  const tailCredential = tailCandidates[0];

  if (typeof findExpandedTermId(tailCredential, VC_PREVIOUS_CREDENTIAL_ID) !== 'string') {
    throw new Error('Tail credential must include previousCredentialId');
  }

  const resourceId = tailCredential['@id'];
  const tailIssuer = extractGraphId(tailCredential, VC_ISSUER);
  if (typeof tailIssuer !== 'string' || tailIssuer.length === 0) {
    throw new Error('Tail credential must include a string issuer');
  }

  const chain = [];
  const visited = new Set();
  let current = tailCredential;

  while (current) {
    if (visited.has(current['@id'])) {
      throw new Error('Credential chain contains a cycle');
    }
    visited.add(current['@id']);
    chain.unshift(current);
    const prevId = findExpandedTermId(current, VC_PREVIOUS_CREDENTIAL_ID);
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
    const parentSubject = extractGraphObject(parent, VC_SUBJECT);
    const parentDelegate = parentSubject && parentSubject['@id'];
    if (typeof parentDelegate !== 'string' || parentDelegate.length === 0) {
      throw new Error(`Credential ${parent['@id']} missing credentialSubject.id for delegation binding`);
    }
    if (extractGraphId(child, VC_ISSUER) !== parentDelegate) {
      throw new Error(
        `Credential ${child['@id']} issuer ${extractGraphId(child, VC_ISSUER) ?? 'undefined'} does not match parent delegate ${parentDelegate}`,
      );
    }
  }

  const rootCredential = chain[0];
  const expectedRootId = rootCredential['@id'];
  const rootDeclaredId = extractGraphId(rootCredential, VC_ROOT_CREDENTIAL_ID);
  if (rootDeclaredId && rootDeclaredId !== expectedRootId) {
    throw new Error(
      `Root credential ${rootCredential['@id']} must declare rootCredentialId equal to its own id`,
    );
  }

  chain.slice(1).forEach((vc) => {
    const declaredRootId = findExpandedTermId(vc, VC_ROOT_CREDENTIAL_ID);
    if (typeof declaredRootId !== 'string' || declaredRootId.length === 0) {
      throw new Error(
        `Credential ${vc['@id']} must include rootCredentialId referencing ${expectedRootId}`,
      );
    }
    if (declaredRootId !== expectedRootId) {
      throw new Error(
        `Credential ${vc['@id']} rootCredentialId ${declaredRootId} does not match root ${expectedRootId}`,
      );
    }
  });

  if (!matchesType(rootCredential, VC_TYPE_DELEGATION_CREDENTIAL)) {
    throw new Error('Root credential must be a DelegationCredential');
  }

  const rootIssuerId = extractGraphId(rootCredential, VC_ISSUER);
  if (typeof rootIssuerId !== 'string' || rootIssuerId.length === 0) {
    throw new Error('Root credential must include a string issuer');
  }

  const rootTypes = normalizeTypeList(rootCredential['@type']);

  const rootClaims = extractGraphObject(rootCredential, VC_SUBJECT) ?? {};

  const depthByActor = new Map([[rootIssuerId, 0]]);
  const delegations = [];
  const registeredDelegations = new Set();

  const registerDelegation = (principalId, depth) => {
    if (typeof principalId !== 'string' || principalId.length === 0) {
      throw new Error('Tried to register delegation with no principal ID');
    }
    if (registeredDelegations.has(principalId)) {
      return;
    }
    registeredDelegations.add(principalId);
    delegations.push({ principalId, depth, actions: [ACTION_VERIFY] });
  };

  const rootDelegateId = extractGraphId(rootClaims, VC_SUBJECT);
  if (typeof rootDelegateId === 'string' && rootDelegateId.length > 0) {
    registerDelegation(rootDelegateId, 1);
    depthByActor.set(rootDelegateId, 1);
  }

  const delegationCredentialsInChain = [];

  chain.forEach((vc) => {
    if (!matchesType(vc, VC_TYPE_DELEGATION_CREDENTIAL)) {
      return;
    }

    delegationCredentialsInChain.push(vc);

    const delegator = extractGraphId(vc, VC_ISSUER);
    const delegate = extractGraphId(vc, VC_SUBJECT);
    if (typeof delegate !== 'string' || delegate.length === 0) {
      return;
    }

    const parentDepth = depthByActor.get(delegator) ?? 0;
    const depth = parentDepth + 1;
    depthByActor.set(delegate, depth);
    registerDelegation(delegate, depth);
  });

  const tailTypes = normalizeTypeList(tailCredential['@type']);
  const tailDelegateId = extractGraphId(tailCredential, VC_SUBJECT);
  if (typeof tailDelegateId !== 'string' || tailDelegateId.length === 0) {
    throw new Error('Tail credential must include a subject id');
  }

  const tailIssuerId = extractGraphId(tailCredential, VC_ISSUER);
  if (typeof tailIssuerId !== 'string' || tailIssuerId.length === 0) {
    throw new Error('Tail credential must include a string issuer');
  }

  const tailDepth = depthByActor.get(tailIssuerId) ?? delegationCredentialsInChain.length;
  registerDelegation(tailDelegateId, tailDepth);

  return {
    resourceId,
    delegations,
    rootTypes,
    tailTypes,
    rootIssuerId,
    tailIssuerId,
    tailDepth,
  };
}

export function summarizeStandaloneCredential(credential) {
  if (!credential || typeof credential !== 'object') {
    throw new Error('Standalone credential is required to summarize');
  }
  const { id, type, issuer } = credential;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Standalone credential must include an id');
  }
  if (typeof issuer !== 'string' || issuer.length === 0) {
    throw new Error('Standalone credential must include an issuer');
  }
  const types = normalizeTypeList(type);

  return {
    resourceId: id,
    delegations: [],
    rootTypes: types,
    tailTypes: types,
    rootIssuerId: issuer,
    tailIssuerId: issuer,
    tailDepth: 0,
  };
}
