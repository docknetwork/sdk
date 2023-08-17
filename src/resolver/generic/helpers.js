import MultiResolver from './multi-resolver'; // eslint-disable-line import/no-cycle
import Resolver from './resolver';
import { WILDCARD } from './const';
import { itemsAllowed } from '../utils';

/**
 * Creates a resolver.
 *
 * @template T
 * @param {Resolver<T> | function(): Promise<T>} resolverOrFn
 * @param {object?} config
 * @param {(string | symbol)?} [config.prefix=WILDCARD]
 * @param {(string | symbol)?} [config.method=WILDCARD]
 * @returns {Resolver<T> | MultiResolver<T>}
 */
// eslint-disable-next-line import/prefer-default-export
export const createResolver = (
  resolverOrFn,
  { prefix = WILDCARD, method = WILDCARD } = {},
) => {
  const isMulti = Array.isArray(prefix) || Array.isArray(method);
  const baseClass = isMulti ? MultiResolver : Resolver;

  return new (class extends baseClass {
    static PREFIX = prefix;
    static METHOD = method;

    constructor() {
      super();

      const isFn = typeof resolverOrFn === 'function';
      if (!isFn && resolverOrFn instanceof Resolver) {
        itemsAllowed(
          [].concat(resolverOrFn.constructor.PREFIX),
          [].concat(this.constructor.PREFIX),
          WILDCARD,
        );
        itemsAllowed(
          [].concat(resolverOrFn.constructor.METHOD),
          [].concat(this.constructor.METHOD),
          WILDCARD,
        );
      }

      this.resolve = isFn
        ? resolverOrFn
        : resolverOrFn.resolve.bind(resolverOrFn);
    }
  })();
};
