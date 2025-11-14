import { authorize } from './cedar-auth.js';

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
    const decision = authorize({
      policies,
      principalId: resolvedPrincipalId,
      actionId,
      resourceId: facts.resourceId,
      vpSignerId: facts.presentationSigner,
      entities,
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
      facts,
    });
    if (decision !== 'allow') {
      return { decision, authorizations };
    }
  }

  return { decision: 'allow', authorizations };
}

