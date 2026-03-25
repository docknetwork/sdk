import credentialDocumentLoader from '../../credential-sdk/src/vc/document-loader.js';
import pharmacyDelegationPolicy from '../tests/fixtures/delegation-pharmacy-policy.json' with { type: 'json' };

const loadDocumentDefault = credentialDocumentLoader();

/**
 * JSON-LD document loader that also resolves the pharmacy delegation policy fixture by policy id
 * (so examples/tests do not pass a separate policy resolver).
 * @param {string} url
 */
export default function documentLoader(url) {
  if (url === pharmacyDelegationPolicy.id) {
    return Promise.resolve({
      contextUrl: null,
      documentUrl: url,
      document: structuredClone(pharmacyDelegationPolicy),
    });
  }
  return loadDocumentDefault(url);
}
