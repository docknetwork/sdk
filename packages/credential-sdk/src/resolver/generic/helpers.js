import Resolver from './resolver';
import { WILDCARD } from './const';
import { ensureItemsAllowed } from '../utils';

/**
 * Creates a resolver.
 *
 * @template T
 * @param {Resolver<T> | function(string): Promise<T>} resolverOrFn
 * @param {object} [config={}]
 * @param {Array<string> | string | symbol} [config.prefix=WILDCARD]
 * @param {Array<string> | string | symbol} [config.method=WILDCARD]
 * @returns {Resolver<T> | ResolverRouter<T>}
 */
export const createResolver = (
  resolverOrFn,
  { prefix = WILDCARD, method = WILDCARD } = {},
) => new (class ResolverCreatedUsingCreateResolver extends Resolver {
  prefix = prefix;

  method = method;

  constructor() {
    super();

    const isFn = typeof resolverOrFn === 'function';
    if (!isFn && resolverOrFn instanceof Resolver) {
      ensureItemsAllowed(
        [].concat(resolverOrFn.prefix),
        [].concat(this.prefix),
        WILDCARD,
      );
      ensureItemsAllowed(
        [].concat(resolverOrFn.method),
        [].concat(this.method),
        WILDCARD,
      );
    }

    this.resolve = isFn
      ? resolverOrFn
      : resolverOrFn.resolve.bind(resolverOrFn);
  }

  async resolve(_id) {
    throw new Error('Unimplemented');
  }
})();
