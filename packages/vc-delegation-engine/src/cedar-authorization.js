import { authorize } from './cedar-auth.js';
import { ensureEntity, addParent } from './cedar-utils.js';

function cloneEntities(entities = []) {
  return (entities ?? []).map((entity) => ({
    uid: { ...entity.uid },
    attrs: { ...entity.attrs },
    parents: [...(entity.parents ?? [])],
  }));
}

export function authorizeEvaluationsWithCedar({
  evaluations = [],
  policies,
  actionId = 'Verify',
  principalId,
} = {}) {
  if (!policies) {
    return { decision: 'allow', authorizations: [] };
  }

  const authorizations = [];
  for (const evaluation of evaluations) {
    if (!evaluation) {
      continue;
    }
    const {
      summary,
      facts,
      entities,
      authorizedClaims,
      authorizedClaimsBySubject,
    } = evaluation;
    if (!summary || !facts || !entities) {
      continue;
    }

    const resolvedPrincipalId = principalId ?? facts.principalId ?? facts.presentationSigner;
    const resourceTypes = evaluation.resourceTypes?.length
      ? evaluation.resourceTypes
      : facts.resourceTypes?.length
        ? facts.resourceTypes
        : ['unknown'];

    for (const resourceType of resourceTypes) {
      const entitiesForAuth = cloneEntities(entities);
      const resourceEntity = ensureEntity(entitiesForAuth, 'Credential::Object', resourceType);
      const verifyChain = ensureEntity(entitiesForAuth, 'Credential::Chain', 'Action:Verify');
      addParent(resourceEntity, verifyChain.uid);

      const decision = authorize({
        policies,
        principalId: resolvedPrincipalId,
        actionId,
        resourceId: resourceType,
        vpSignerId: facts.presentationSigner,
        entities: entitiesForAuth,
        rootTypes: summary.rootTypes,
        rootIssuerId: summary.rootIssuerId,
        tailTypes: summary.tailTypes,
        tailIssuerId: summary.tailIssuerId,
        tailDepth: summary.tailDepth,
        authorizedClaims,
        authorizedClaimsBySubject,
      });

      authorizations.push({
        decision,
        summary,
        facts: {
          ...facts,
          evaluatedResourceType: resourceType,
        },
      });
      if (decision !== 'allow') {
        return { decision, authorizations };
      }
    }
  }

  return { decision: 'allow', authorizations };
}

