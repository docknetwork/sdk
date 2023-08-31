import { ensureString } from '../../utils/type-helpers';
import { withExtendedStaticProperties } from '../../utils/inheritance';
import { WILDCARD } from './const';

/**
 * @class
 * @abstract
 * @template T
 */
class Resolver {
  /**
   * Matching prefix - either a string or wildcard pattern.
   * @type {string | symbol}
   * @abstract
   * @static
   */
  static PREFIX;
  /**
   * Matching method - either a string or wildcard pattern.
   * @type {string | symbol}
   * @abstract
   * @static
   */
  static METHOD;

  /**
   * Returns `true` if an entity with the provided identifier can be resolved using this resolver.
   * @param {string} id - fully qualified identifier.
   * @returns {boolean}
   */
  supports(id) {
    ensureString(id);

    return (
      (this.constructor.METHOD === WILDCARD
        || this.method(id) === this.constructor.METHOD)
      && (this.constructor.PREFIX === WILDCARD
        || this.prefix(id) === this.constructor.PREFIX)
    );
  }

  /**
   * Resolves an entity with the provided identifier.
   * @abstract
   * @param {string} id - fully qualified identifier.
   * @returns {Promise<T>}
   */
  async resolve(id) {
    throw new Error(
      `Unimplemented \`resolve\` for \`${this.constructor.name}\`, can't resolve \`${id}\``,
    );
  }

  /**
   * Extracts a prefix from the provided identifier.
   *
   * @param {string} id
   * @returns {string}
   */
  prefix(id) {
    ensureString(id);
    const end = id.indexOf(':');

    return ~end ? id.slice(0, end) : '';
  }

  /**
   * Extracts a method from the provided identifier.
   *
   * @param {string} id
   * @returns {string}
   */
  method(id) {
    ensureString(id);
    const start = id.indexOf(':');
    const end = id.indexOf(':', start + 1);

    return ~start && ~end ? id.slice(start + 1, end) : '';
  }
}

/**
 * Resolves an entity if it's identifier is supported.
 * Each resolver must have static `string` or `WILDCARD` symbol properties `PREFIX` and `METHOD`,
 * then the `supports` method will return `true` if they match the identifier.
 * In case the resolver must be used for any `PREFIX`/`METHOD` as default, use the `WILDCARD` symbol.
 */
export default withExtendedStaticProperties(['PREFIX', 'METHOD'], Resolver);
