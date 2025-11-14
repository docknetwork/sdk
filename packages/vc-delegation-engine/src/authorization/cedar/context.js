import { ensureEntity, entityRef, addParent } from '../../cedar-utils.js';
import { ACTION_VERIFY, VERIFY_CHAIN_ID, UNKNOWN_ACTOR_ID } from '../../constants.js';

function cloneEntities(entities = []) {
  return (entities ?? []).map((entity) => ({
    uid: { ...(entity?.uid ?? {}) },
    attrs: { ...(entity?.attrs ?? {}) },
    parents: Array.isArray(entity?.parents) ? [...entity.parents] : [],
  }));
}

export function buildCedarContext({
  principalId,
  actionId = ACTION_VERIFY,
  resourceId,
  vpSignerId,
  entities = [],
  rootTypes,
  rootClaims,
  rootIssuerId,
  tailTypes,
  tailClaims,
  tailIssuerId,
  tailDepth,
  authorizedClaims,
  authorizedClaimsBySubject,
} = {}) {
  if (typeof principalId !== 'string' || principalId.length === 0) {
    throw new Error('buildCedarContext requires a principalId');
  }
  if (typeof actionId !== 'string' || actionId.length === 0) {
    throw new Error('buildCedarContext requires an actionId');
  }
  if (typeof resourceId !== 'string' || resourceId.length === 0) {
    throw new Error('buildCedarContext requires a resourceId');
  }

  const workingEntities = cloneEntities(entities);
  ensureEntity(workingEntities, 'Credential::Actor', principalId);
  ensureEntity(workingEntities, 'Credential::Action', actionId);
  const resourceEntity = ensureEntity(workingEntities, 'Credential::Object', resourceId);
  const verifyChain = ensureEntity(workingEntities, 'Credential::Chain', VERIFY_CHAIN_ID);
  addParent(resourceEntity, verifyChain.uid);

  const rootTypesArray = Array.isArray(rootTypes) ? Array.from(new Set(rootTypes)) : [];
  const tailTypesArray = Array.isArray(tailTypes) ? Array.from(new Set(tailTypes)) : [];
  const tailDepthValue = typeof tailDepth === 'number' ? tailDepth : 0;
  const context = {
    vpSigner: entityRef('Credential::Actor', vpSignerId ?? principalId ?? UNKNOWN_ACTOR_ID),
    rootTypes: rootTypesArray,
    rootClaims,
    tailTypes: tailTypesArray,
    tailClaims,
    tailDepth: tailDepthValue,
    authorizedClaims,
    authorizedClaimsBySubject,
  };

  if (typeof rootIssuerId === 'string' && rootIssuerId.length > 0) {
    context.rootIssuer = entityRef('Credential::Actor', rootIssuerId);
  }
  if (typeof tailIssuerId === 'string' && tailIssuerId.length > 0) {
    context.tailIssuer = entityRef('Credential::Actor', tailIssuerId);
  }

  return {
    principal: { type: 'Credential::Actor', id: principalId },
    action: { type: 'Credential::Action', id: actionId },
    resource: { type: 'Credential::Object', id: resourceId },
    context,
    entities: workingEntities,
  };
}

export function runCedarAuthorization({ cedar, policies, request }) {
  if (!cedar || typeof cedar.isAuthorized !== 'function') {
    throw new Error('runCedarAuthorization requires a cedar module with isAuthorized');
  }
  if (!request) {
    throw new Error('runCedarAuthorization requires a request payload');
  }
  const result = cedar.isAuthorized({
    ...request,
    policies,
  });
  if (result.type === 'failure') {
    throw new Error(result.errors.map((e) => e.message).join('; '));
  }
  return result.response.decision;
}

