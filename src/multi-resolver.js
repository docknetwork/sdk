import DIDResolver from './did-resolver';

function getResolveMethod(provider) {
  return provider.resolve ? provider.resolve.bind(provider) : provider;
}

export default class MultiResolver extends DIDResolver {
  /**
   * Create a Resolver which delegates to the appropriate child Resolver according to an index.
   * @constructor
   * @param {object} resolvers - A map from DID method name to a Resolver.
   *     The resolvers must either inherit from DIDResolver, or be an async function
   *     from DID string to DIDDocument which throws NoDIDError when and only
   *     when the did in question does not exist.
   * @param {DIDResolver | null} catchAll - An optional fallback to use when index does not specify an
   * implementation for the requested method.
   */
  constructor(resolvers, catchAll) {
    super();
    this.resolvers = resolvers;
    this.catchAll = catchAll;
  }

  /**
   * Resolve the given DID with the providers or try to fetch from the universal resolver
   * if available.
   * @param {string} did - A full DID (with method, like did:dock:5....)
   * @returns {Promise<object>} Returns a promise to the DID document
   */
  async resolve(did) {
    const { method } = this.parseDid(did);
    const resolver = this.resolvers[method];

    if (resolver) {
      return getResolveMethod(resolver)(did);
    }
    if (this.catchAll) {
      return getResolveMethod(this.catchAll)(did);
    }
    throw new Error(`No resolver found for DID ${did}`);
  }
}
