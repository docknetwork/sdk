import Resolver from './resolver';
import { cacheLast, itemsOrWildcard } from '../utils';
import { WILDCARD } from './const';
import { ensureString } from '../../utils';

/**
 * Acts as a router and resolves an entity using a provided list of resolvers.
 *
 * Each resolver must have properties `prefix` and `method` set.
 *
 * If the resolver must be used for any `prefix`/`method` as default, use the `WILDCARD` symbol.
 * In case no matching resolver is found, will be used first to match either the `WILDCARD` method, `WILDCARD` prefix, or both.
 *
 * @class
 * @abstract
 * @template T
 */
export default class ResolverRouter extends Resolver {
  /**
   * Matching string prefix, an array of string prefixes, or wildcard pattern.
   * @type {Array<string> | string | symbol}
   * @prop prefix
   */

  /**
   * Matching string method, an array of string methods, or wildcard pattern.
   * @type {Array<string> | string | symbol}
   * @prop method
   */

  /**
   *
   * @param {Array<Resolver<T> | ResolverRouter<T>>} [resolvers=[]]
   */
  constructor(resolvers = []) {
    super();

    let resolverList;
    if (this.resolve !== ResolverRouter.prototype.resolve) {
      throw new Error(
        `\`${this.constructor.name}\` has a custom \`resolve\` implementation, so it can't have any nested resolvers`,
      );
    } else {
      resolverList = resolvers;

      if (!resolverList.length) {
        throw new Error(
          'No resolvers were provided. You need to either implement `resolve` or provide a list of resolvers',
        );
      }
    }

    this.prefix = itemsOrWildcard(
      resolverList.flatMap((resolver) => [].concat(resolver.prefix)),
      WILDCARD,
    );
    this.method = itemsOrWildcard(
      resolverList.flatMap((resolver) => [].concat(resolver.method)),
      WILDCARD,
    );
    this.resolvers = this.buildResolversMap(resolverList);
    this.matchingResolver = cacheLast(this.matchingResolver);
  }

  /**
   * Returns `true` if an entity with the provided identifier can be resolved using this resolver.
   * @param {string} id - fully qualified identifier.
   * @returns {boolean}
   */
  supports(id) {
    return this.matchingResolver(id) != null;
  }

  /**
   * Resolves an entity with the provided identifier.
   * @param {string} id - fully qualified identifier.
   * @returns {Resolver<T> | ResolverRouter<T> | null}
   */
  matchingResolver(id) {
    ensureString(id);
    const prefix = this.extractPrefix(id);
    const method = this.extractMethod(id);

    for (const [currentPrefix, currentMethod] of [
      [prefix, method],
      [prefix, WILDCARD],
      [WILDCARD, method],
      [WILDCARD, WILDCARD],
    ]) {
      const resolver = this.resolvers[currentPrefix]?.[currentMethod];

      if (resolver === this || resolver?.supports(id)) return resolver;
    }

    return null;
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
      if (
        this === resolver
        && resolver.resolve === ResolverRouter.prototype.resolve
      ) {
        throw new Error(
          `Resolver \`${resolver.constructor.name}\` must implement its own \`resolve\``,
        );
      }
      if (resolver.prefix == null) {
        throw new Error(`No prefix in \`${resolver.constructor.name}\``);
      } else if (resolver.method == null) {
        throw new Error(`No method in \`${resolver.constructor.name}\``);
      }
      const prefixArr = [].concat(resolver.prefix);
      const methodArr = [].concat(resolver.method);

      for (const prefix of new Set(prefixArr)) {
        for (const method of new Set(methodArr)) {
          acc[prefix] ||= Object.create(null);
          if (acc[prefix][method] != null) {
            throw new Error(
              `Two resolvers for the same prefix and method - \`${prefix}:${method}:\`: \`${acc[prefix][method].constructor.name}\` and \`${resolver.constructor.name}\``,
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

    return await resolver.resolve(id);
  }
}
