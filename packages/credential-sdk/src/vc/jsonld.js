import jsonld from 'jsonld';
import defaultDocumentLoader from './document-loader';

/**
 * Helper method to ensure credential is valid according to the context
 * @param credential
 */
export async function expandJSONLD(credential, options = {}) {
  if (options.documentLoader && options.resolver) {
    throw new Error(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  }

  const expanded = await jsonld.expand(credential, {
    ...options,
    documentLoader:
      options.documentLoader || defaultDocumentLoader(options.resolver),
  });
  return expanded[0];
}
