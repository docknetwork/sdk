import axios from 'axios';
import testContext from './contexts';
import DIDResolver from '../../did-resolver'; // eslint-disable-line

/**
 * Takes a resolver and returns a function that returns a document or throws an error when the document
 * cannot be found.
 * @param {DIDResolver} [resolver] - The resolver is optional but should be passed when DIDs need to be resolved.
 * @returns {loadDocument} - the returned function
 */
export default function (resolver = null) {
  /**
   * Resolve a URI. If the URI is a DID, then the resolver is used to resolve it.
   * Else, the hardcoded contexts are used to resolve the URI and if that fails
   * it will be fetched using an HTTP client
   * @param {string} uri
   * @returns {Promise<{documentUrl: string, contextUrl: string, document: *}>}
   */
  async function loadDocument(uri) {
    let document;

    if (resolver && uri.startsWith('did:')) {
      // Try to resolve a DID and throw if cannot resolve
      document = await resolver.resolve(uri);
    } else {
      const context = testContext.get(uri);
      if (context) {
        document = context;
      } else {
        const { data: doc } = await axios.get(uri);
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
