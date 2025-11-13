import jsonld from 'jsonld';
import { verifyVPWithDelegation } from '../src/engine.js';
import documentLoader from './document-loader.js';

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
      policies,
      resourceId,
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
