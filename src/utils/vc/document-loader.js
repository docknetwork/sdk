import axios from 'axios';
import testContext from './contexts';

/**
 * Takes a resolver and returns a function that returns a document or throws an error when the document
 * cannot be found.
 * @param resolver - The resolver is optional but should be passed when DIDs need to be resolved.
 * @returns {function(*=): {documentUrl: *, document: null}}
 */
export default function(resolver) {

  /**
   * Resolve a URI. If the URI is a DID, then the resolver is used to resolve it.
   * Else, the hardcoded contexts are used to resolve the URI and if that fails
   * it will be fetched using an HTTP client
   * @param uri
   * @returns {Promise<{documentUrl: *, document: *}>}
   */
  async function loadDocument(uri) {
    let document;

    if (resolver && uri.startsWith('did:')) {
      // Try to resolve a DID and throw if cannot resolve
      document = await resolver.resolve(uri);
    } else {
      const context = testContext.get(uri);
      if(context) {
        document = context;
      } else {
        //console.log('fetching uri', uri);
        const {data: doc} = await axios.get(uri);
        document = doc;
      }
    }

    return {
      documentUrl: uri,
      document: document
    };
  }

  return loadDocument;
}
