import jsonld from 'jsonld';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import { verifyVPWithDelegation } from '../src/engine.js';
import { authorizeEvaluationsWithCedar } from '../src/cedar-authorization.js';
import documentLoader from './document-loader.js';

export async function runScenario(title, vp, policies) {
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
    });
    if (result.failures && result.failures.length > 0) {
      console.error('delegation failed ->', result);
    } else {
      let decision = result.decision;
      let authorizations = [];
      if (policies) {
        const authorizationOutcome = authorizeEvaluationsWithCedar({
          cedar,
          evaluations: result.evaluations,
          policies,
        });
        decision = authorizationOutcome.decision;
        authorizations = authorizationOutcome.authorizations;
      }
      if (decision !== 'allow') {
        console.error('delegation failed ->', { ...result, authorizations, decision });
      } else {
        console.log('delegation valid ->', decision);
      }
    }
  } catch (error) {
    console.error('error:', error.message);
  }

  console.log();
}
