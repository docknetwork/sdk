import { buildCedarContext, runCedarAuthorization } from './context.js';
import { ACTION_VERIFY, UNKNOWN_ACTOR_ID, UNKNOWN_IDENTIFIER } from '../../constants.js';

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
  actionId = ACTION_VERIFY,
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

  const resolvedPrincipalId = principalId ?? facts.principalId ?? facts.presentationSigner ?? UNKNOWN_ACTOR_ID;
  const resourceTypes = (() => {
    if (evaluation.resourceTypes?.length) {
      return evaluation.resourceTypes;
    }
    if (facts.resourceTypes?.length) {
      return facts.resourceTypes;
    }
    return [UNKNOWN_IDENTIFIER];
  })();

  return resourceTypes.map((resourceType) => ({
    summary,
    facts,
    actionId,
    principalId: resolvedPrincipalId,
    resourceId: resourceType,
    vpSignerId: facts.presentationSigner,
    entities: cloneEntities(entities),
    rootTypes: summary.rootTypes,
    rootClaims: summary.rootClaims,
    rootIssuerId: summary.rootIssuerId,
    tailTypes: summary.tailTypes,
    tailClaims: summary.tailClaims,
    tailIssuerId: summary.tailIssuerId,
    tailDepth: summary.tailDepth,
    authorizedClaims,
    authorizedClaimsBySubject,
    parentClaims: facts.parentClaims,
  }));
}

export function authorizeEvaluationsWithCedar({
  cedar,
  evaluations = [],
  policies,
  actionId = ACTION_VERIFY,
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
      const request = buildCedarContext(input);
      const decision = runCedarAuthorization({
        cedar,
        policies,
        request,
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
