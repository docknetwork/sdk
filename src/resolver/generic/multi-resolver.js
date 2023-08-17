import { isObject } from 'jsonld/lib/types';
import Resolver from './resolver';
import { createResolver, itemsAllowed } from '../utils';
import { WILDCARD } from './const';

/**
 * Resolves an entity using a provided list of resolvers.
 * Each resolver must have static properties `PREFIX` and `METHOD`,
 * then the matching resolver will be called with the fully qualified identifier.
 * If the resolver must be used for any `PREFIX`/`METHOD` as default, use the `WILDCARD` symbol.
 * In case no matching resolver is found, will be used first to match either the `WILDCARD` method, `WILDCARD` prefix, or both.
 *
 * @template T
 */
export default class MultiResolver extends Resolver {
  constructor(resolvers) {
    super();

    let resolverList;
    if (this.resolve !== MultiResolver.prototype.resolve) {
      if (!resolvers) {
        resolverList = [this];
      } else {
        throw new Error(
          `\`${this.constructor.name}\` has a custom \`resolve\` implementation, so it can't have any nested resolvers`,
        );
      }
    } else {
      if (isObject(resolvers)) {
        // Legacy constructor support
        resolverList = Object.entries(resolvers).map(([prefix, resolverOrFn]) => createResolver(resolverOrFn, { prefix }));
      } else {
        resolverList = resolvers || [];
      }

      if (!resolverList.length) throw new Error('No resolvers provided');
    }

    this.resolvers = this.buildResolversMap(resolverList);
  }

  /**
   * Returns `true` if an entity with the provided identifier can be resolved using this resolver.
   * @param {string} id - fully qualified identifier.
   * @returns {Promise<boolean>}
   */
  supports(id) {
    return this.matchingResolver(id) != null;
  }

  /**
   * Resolves an entity with the provided identifier.
   * @param {string} id - fully qualified identifier.
   * @returns {Resolver<T> | null}
   */
  matchingResolver(id) {
    if (typeof id !== 'string') {
      return null;
    }

    const prefix = this.prefix(id);
    const method = this.method(id);

    return (
      this.resolvers[prefix]?.[method]
      || this.resolvers[prefix]?.[WILDCARD]
      || this.resolvers[WILDCARD]?.[method]
      || this.resolvers[WILDCARD]?.[WILDCARD]
      || null
    );
  }

  /**
   * Builds resolver map from the supplied list.
   *
   * @param {Array<Resolver<T>>} resolverList
   * @returns {Object<string, Object<string, Resolver<T>>>}
   */
  buildResolversMap(resolverList) {
    return resolverList.reduce((acc, resolver) => {
      if (!(resolver instanceof Resolver)) {
        throw new Error(
          `Expected instance of \`Resolver\`, found: \`${
            resolver.constructor?.name || resolver
          }\``,
        );
      }
      if (this === resolver && resolver.resolve === MultiResolver.prototype.resolve) {
        throw new Error(
          `Resolver \`${resolver.constructor.name}\` must implement its own \`resolve\``,
        );
      }
      const { PREFIX, METHOD } = resolver.constructor;
      const prefixArr = [].concat(PREFIX);
      const methodArr = [].concat(METHOD);

      itemsAllowed(prefixArr, [].concat(this.constructor.PREFIX), WILDCARD);
      itemsAllowed(methodArr, [].concat(this.constructor.METHOD), WILDCARD);

      for (const prefix of prefixArr) {
        for (const method of methodArr) {
          acc[prefix] ||= Object.create(null);
          if (acc[prefix][method] != null) {
            throw new Error(
              `Two resolvers for the same prefix and method - \`${prefix}:${method}\`: \`${acc[prefix][method].constructor.name}\` and \`${resolver.constructor.name}\``,
            );
          }
          acc[prefix][method] = resolver;
        }
      }

      return acc;
    }, Object.create(null));
  }

  /**
   * Resolves an entity with the provided identifier.
   * @param {string} id - fully qualified identifier.
   * @returns {Promise<T>}
   */
  async resolve(id) {
    const resolver = this.matchingResolver(id);

    if (resolver == null) {
      throw new Error(`No resolver found for \`${id}\``);
    } else if (!resolver.supports(id)) {
      throw new Error(
        `\`${resolver.constructor.name}\` doesn't support \`${id}\``,
      );
    }

    return resolver.resolve(id);
  }
}