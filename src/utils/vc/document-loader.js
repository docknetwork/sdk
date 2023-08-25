import axios from 'axios';
import cachedUris from './contexts';
import Resolver from "../../resolver/generic/resolver"; // eslint-disable-line

function parseEmbeddedDataURI(embedded) {
  // Strip new lines
  const dataUri = embedded.replace(/\r?\n/g, '');

  // split the URI up into the "metadata" and the "data" portions
  const firstComma = dataUri.indexOf(',');
  if (firstComma === -1) {
    throw new Error('Malformed data URI');
  }

  // Remove the scheme and parse metadata
  const meta = dataUri.substring(5, firstComma).split(';'); // 'data:'.length = 5
  if (meta[0] !== 'application/json') {
    throw new Error(`Expected media type application/json but was ${meta[0]}`);
  }

  const isBase64 = meta.indexOf('base64') !== -1;
  if (isBase64) {
    throw new Error('Base64 embedded JSON is not yet supported');
  }

  // Extract data string
  const dataStr = decodeURIComponent(dataUri.substring(firstComma + 1));
  return JSON.parse(dataStr);
}

/**
 * Takes a resolver and returns a function that returns a document or throws an error when the document
 * cannot be found.
 * @param {Resolver} [resolver] - The resolver is optional but should be passed when
 * `DID`s / `StatusList2021Credential`s / `Blob`s / revocation registries and other documents need to be resolved.
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

    if (uriString.startsWith('data:')) {
      document = parseEmbeddedDataURI(uriString);
    } else if (resolver?.supports(uriString)) {
      // Try to resolve a DID and throw if cannot resolve
      document = await resolver.resolve(uriString);
    } else {
      // Strip ending slash from uri to determine cache key
      const cacheKey = uriString.endsWith('/')
        ? uriString.substring(0, uri.length - 1)
        : uriString;

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
