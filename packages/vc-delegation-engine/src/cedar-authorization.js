import { authorize } from './cedar-auth.js';
import { ensureEntity, addParent } from './cedar-utils.js';

function cloneEntities(entities = []) {
  return (entities ?? []).map((entity) => ({
    uid: { ...entity.uid },
    attrs: { ...entity.attrs },
    parents: [...(entity.parents ?? [])],
  }));
}

/**
 * Derives Cedar authorization request payloads from a single evaluation record.
 * @param {Object} options
 * @param {DelegationEvaluation} options.evaluation
 * @param {string} [options.actionId='Verify']
 * @param {string} [options.principalId]
 * @returns {Array<Object>}
 */
export function buildAuthorizationInputsFromEvaluation({
  evaluation,
  actionId = 'Verify',
  principalId,
} = {}) {
  if (!evaluation) {
    return [];
  }
  const {
    summary,
    facts,
    entities,
    authorizedClaims,
    authorizedClaimsBySubject,
  } = evaluation;
  if (!summary || !facts || !entities) {
    return [];
  }

  const resolvedPrincipalId = principalId ?? facts.principalId ?? facts.presentationSigner ?? 'unknown';
  const resourceTypes = evaluation.resourceTypes?.length
    ? evaluation.resourceTypes
    : facts.resourceTypes?.length
      ? facts.resourceTypes
      : ['unknown'];

  return resourceTypes.map((resourceType) => {
    const entitiesForAuth = cloneEntities(entities);
    const resourceEntity = ensureEntity(entitiesForAuth, 'Credential::Object', resourceType);
    const verifyChain = ensureEntity(entitiesForAuth, 'Credential::Chain', 'Action:Verify');
    addParent(resourceEntity, verifyChain.uid);

    return {
      summary,
      facts,
      actionId,
      principalId: resolvedPrincipalId,
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
    };
  });
}

export function authorizeEvaluationsWithCedar({
  cedar,
  evaluations = [],
  policies,
  actionId = 'Verify',
  principalId,
} = {}) {
  if (!policies) {
    return { decision: 'allow', authorizations: [] };
  }
  if (!cedar || typeof cedar.isAuthorized !== 'function') {
    throw new Error('authorizeEvaluationsWithCedar requires a cedar module when policies are provided');
  }

  const authorizations = [];
  for (const evaluation of evaluations) {
    const authorizationInputs = buildAuthorizationInputsFromEvaluation({
      evaluation,
      actionId,
      principalId,
    });
    for (const input of authorizationInputs) {
      const decision = authorize({
        cedar,
        policies,
        principalId: input.principalId,
        actionId: input.actionId,
        resourceId: input.resourceId,
        vpSignerId: input.vpSignerId,
        entities: input.entities,
        rootTypes: input.rootTypes,
        rootIssuerId: input.rootIssuerId,
        tailTypes: input.tailTypes,
        tailIssuerId: input.tailIssuerId,
        tailDepth: input.tailDepth,
        authorizedClaims: input.authorizedClaims,
        authorizedClaimsBySubject: input.authorizedClaimsBySubject,
      });

      authorizations.push({
        decision,
        summary: input.summary,
        facts: {
          ...input.facts,
          evaluatedResourceType: input.resourceId,
        },
      });
      if (decision !== 'allow') {
        return { decision, authorizations };
      }
    }
  }

  return { decision: 'allow', authorizations };
}

