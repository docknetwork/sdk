import axios from 'axios';
import cachedUris from './contexts';
import DIDResolver from '../../did-resolver'; // eslint-disable-line

/**
 * Takes a resolver and returns a function that returns a document or throws an error when the document
 * cannot be found.
 * @param {DIDResolver} [resolver] - The resolver is optional but should be passed when DIDs need to be resolved.
 * @returns {loadDocument} - the returned function
 */
function documentLoader(resolver = null) {
  /**
   * Resolve a URI. If the URI is a DID, then the resolver is used to resolve it.
   * Else, the hardcoded contexts are used to resolve the URI and if that fails
   * it will be fetched using an HTTP client
   * @param {string} uri
   * @returns {Promise<{documentUrl: string, contextUrl: string, document: *}>}
   */
  async function loadDocument(uri) {
    let document;
    const uriString = uri.toString();
    if (resolver && uriString.startsWith('did:')) {
      // Try to resolve a DID and throw if cannot resolve
      document = await resolver.resolve(uriString);
    } else {
      // Strip ending slash from uri to determine cache key
      const cacheKey = uriString.endsWith('/') ? uriString.substring(0, uri.length - 1) : uriString;

      // Check its not in data cache
      const cachedData = cachedUris.get(cacheKey);
      if (cachedData) {
        document = cachedData;
      } else {
        const { data: doc } = await axios.get(uriString);
        cachedUris.set(cacheKey, doc);
        document = doc;
      }
    }

    return {
      contextUrl: null,
      documentUrl: uri,
      document,
    };
  }

  return loadDocument;
}

export default documentLoader;
