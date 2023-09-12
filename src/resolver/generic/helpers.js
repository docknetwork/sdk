import MultiResolver from './multi-resolver';
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
 * @returns {Resolver<T> | MultiResolver<T>}
 */
export const createResolver = (
  resolverOrFn,
  { prefix = WILDCARD, method = WILDCARD } = {},
) => {
  const isMulti = Array.isArray(prefix) || Array.isArray(method);
  const baseClass = isMulti ? MultiResolver : Resolver;

  return new (class ResolverCreatedUsingCreateResolver extends baseClass {
    static PREFIX = prefix;
    static METHOD = method;

    constructor() {
      super();

      const isFn = typeof resolverOrFn === 'function';
      if (!isFn && resolverOrFn instanceof Resolver) {
        ensureItemsAllowed(
          [].concat(resolverOrFn.constructor.PREFIX),
          [].concat(this.constructor.PREFIX),
          WILDCARD,
        );
        ensureItemsAllowed(
          [].concat(resolverOrFn.constructor.METHOD),
          [].concat(this.constructor.METHOD),
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
};
