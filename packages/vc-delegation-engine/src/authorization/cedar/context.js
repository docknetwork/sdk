import { ensureEntity, entityRef, addParent } from '../../cedar-utils.js';
import { ACTION_VERIFY, VERIFY_CHAIN_ID, UNKNOWN_ACTOR_ID } from '../../constants.js';

const ACTOR_ENTITY = 'Credential::Actor';
const ACTION_ENTITY = 'Credential::Action';
const OBJECT_ENTITY = 'Credential::Object';
const CHAIN_ENTITY = 'Credential::Chain';

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
  parentClaims,
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
  ensureEntity(workingEntities, ACTOR_ENTITY, principalId);
  ensureEntity(workingEntities, ACTION_ENTITY, actionId);
  const resourceEntity = ensureEntity(workingEntities, OBJECT_ENTITY, resourceId);
  const verifyChain = ensureEntity(workingEntities, CHAIN_ENTITY, VERIFY_CHAIN_ID);
  addParent(resourceEntity, verifyChain.uid);

  const rootTypesArray = Array.isArray(rootTypes) ? Array.from(new Set(rootTypes)) : [];
  const tailTypesArray = Array.isArray(tailTypes) ? Array.from(new Set(tailTypes)) : [];
  const tailDepthValue = typeof tailDepth === 'number' ? tailDepth : 0;
  const context = {
    vpSigner: entityRef(ACTOR_ENTITY, vpSignerId ?? principalId ?? UNKNOWN_ACTOR_ID),
    rootTypes: rootTypesArray,
    rootClaims,
    tailTypes: tailTypesArray,
    tailClaims,
    tailDepth: tailDepthValue,
    authorizedClaims,
    authorizedClaimsBySubject,
  };
  context.parentClaims = parentClaims ?? {};

  if (typeof rootIssuerId === 'string' && rootIssuerId.length > 0) {
    context.rootIssuer = entityRef(ACTOR_ENTITY, rootIssuerId);
  }
  if (typeof tailIssuerId === 'string' && tailIssuerId.length > 0) {
    context.tailIssuer = entityRef(ACTOR_ENTITY, tailIssuerId);
  }

  return {
    principal: { type: ACTOR_ENTITY, id: principalId },
    action: { type: ACTION_ENTITY, id: actionId },
    resource: { type: OBJECT_ENTITY, id: resourceId },
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
