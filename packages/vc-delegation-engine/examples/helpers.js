import jsonld from 'jsonld';
import { verifyVPWithDelegation } from '../src/engine.js';
import { authorize as authorizeWithCedar } from '../src/cedar-auth.js';
import documentLoader from './document-loader.js';

function buildAuthorizeChain(policies) {
  if (!policies) {
    return undefined;
  }
  return ({
    principalId,
    actionId,
    resourceId,
    presentationSigner,
    summary,
    entities,
    authorizedClaims,
    authorizedClaimsBySubject,
  }) => authorizeWithCedar({
    policies,
    principalId,
    actionId,
    resourceId,
    vpSignerId: presentationSigner,
    entities,
    rootTypes: summary.rootTypes,
    rootIssuerId: summary.rootIssuerId,
    tailTypes: summary.tailTypes,
    tailIssuerId: summary.tailIssuerId,
    tailDepth: summary.tailDepth,
    authorizedClaims,
    authorizedClaimsBySubject,
  });
}

export async function runScenario(title, vp, policies, resourceId = undefined) {
  console.log('--------------------------------');
  console.log(`      ${title}`);
  console.log('--------------------------------');

  try {
    const expandedPresentation = await jsonld.expand(vp, { documentLoader });
    const credentialContexts = new Map();
    (vp.verifiableCredential ?? []).forEach((vc) => {
      if (vc && typeof vc.id === 'string' && vc['@context']) {
        credentialContexts.set(vc.id, vc['@context']);
      }
    });
    const result = await verifyVPWithDelegation({
      expandedPresentation,
      credentialContexts,
      resourceId,
      authorizeChain: buildAuthorizeChain(policies),
    });
    if (result.failures && result.failures.length > 0) {
      const messages = result.failures.map((failure) => failure.message).join('; ');
      console.error('delegation failed ->', result);
    } else {
      console.log('delegation valid ->', result.decision);
    }
  } catch (error) {
    console.error('error:', error.message);
  }

  console.log();
}
