import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { ensureEntity, entityRef } from './cedar-utils.js';

// Runs Cedar authorization with the given entities, policies, and context.
export function authorize({
  policies,
  principalId,
  actionId,
  resourceId,
  vpSignerId,
  entities,
  rootTypes,
  rootClaims,
  rootIssuerId,
  tailTypes,
  tailClaims,
  tailIssuerId,
  tailDepth,
  authorizedClaims,
  authorizedClaimsBySubject,
}) {
  ensureEntity(entities, 'Credential::Actor', principalId);
  ensureEntity(entities, 'Credential::Action', actionId);
  ensureEntity(entities, 'Credential::Object', resourceId);

  const rootTypesArray = Array.isArray(rootTypes) ? Array.from(new Set(rootTypes)) : [];
  const tailTypesArray = Array.isArray(tailTypes) ? Array.from(new Set(tailTypes)) : [];
  const tailDepthValue = typeof tailDepth === 'number' ? tailDepth : 0;
  const context = {
    vpSigner: entityRef('Credential::Actor', vpSignerId),
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


  const result = cedar.isAuthorized({
    principal: { type: 'Credential::Actor', id: principalId },
    action: { type: 'Credential::Action', id: actionId },
    resource: { type: 'Credential::Object', id: resourceId },
    context,
    policies,
    entities,
  });
  if (result.type === 'failure') {
    throw new Error(result.errors.map((e) => e.message).join('; '));
  }
  return result.response.decision;
}

