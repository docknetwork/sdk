/* eslint-disable max-classes-per-file */
import { WILDCARD } from './generic/const';
import Resolver from './generic/resolver';

/**
 * Before resolving an entity, ensures that `DockAPI` is initialized, throws an error otherwise.
 * @template T
 * @param {T} resolverClass
 * @returns {T}
 */
export const withInitializedDockAPI = (resolverClass) => class WithInitializedDockAPI extends resolverClass {
  async resolve(url) {
    if (this.dock.isInitialized()) {
      return super.resolve(url);
    } else {
      throw new Error('DockAPI is not connected');
    }
  }
};

/**
 * Returns string containing items of the provided iterable.
 *
 * @template V
 * @param {Iterable<V>} iter
 * @returns {string}
 */
const fmtIter = (iter) => `\`[${[...iter].map((item) => item.toString()).join(', ')}]\``;

/**
 * Ensures that each item is present in the allowed set and that both sets are valid.
 *
 * @template T
 * @param {Iterable<T>} items
 * @param {Iterable<T>} allowed
 * @param {T} wildcard
 */
export const itemsAllowed = (items, allowed, wildcard) => {
  const itemsSet = new Set(items);
  const allowedSet = new Set(allowed);

  for (const toCheck of [itemsSet, allowedSet]) {
    if (toCheck.has(wildcard) && toCheck.size > 1) {
      throw new Error(
        `Can't have wildcard mixed with other patterns for ${fmtIter(toCheck)}`,
      );
    }
  }

  if (allowedSet.has(wildcard)) return;

  for (const item of itemsSet) {
    if (!allowedSet.has(item)) {
      throw new Error(
        `Item not found in ${fmtIter(allowedSet)}: \`${item.toString()}\``,
      );
    }
  }
};

/**
 * Creates a resolver.
 *
 * @template T
 * @param {Resolver<T> | function(): Promise<T>} resolverOrFn
 * @param {object?} config
 * @param {(string | symbol)?} [config.prefix=WILDCARD]
 * @param {(string | symbol)?} [config.method=WILDCARD]
 * @returns {Resolver<T>}
 */
export const createResolver = (
  resolverOrFn,
  { prefix = WILDCARD, method = WILDCARD } = {},
) => new (class extends Resolver {
    static PREFIX = prefix;
    static METHOD = method;

    constructor() {
      super();

      const isResolver = typeof resolverOrFn !== 'function';
      if (isResolver) {
        itemsAllowed(
          [resolverOrFn.constructor.PREFIX || WILDCARD],
          [this.constructor.PREFIX],
        );
        itemsAllowed(
          [resolverOrFn.constructor.METHOD || WILDCARD],
          [this.constructor.METHOD],
        );
      }

      this.resolve = !isResolver
        ? resolverOrFn
        : resolverOrFn.resolve.bind(resolverOrFn);
    }
})();
