import { ensureString } from '../../utils/types';
import { WILDCARD } from './const';

/**
 * @class
 * @abstract
 * @template T
 */
class Resolver {
  /**
   * Matching prefix - either a string, array of strings or wildcard pattern.
   * @type {Array<string> | string | symbol}
   * @prop prefix
   */

  /**
   * Matching method - either a string, array of strings or wildcard pattern.
   * @type {Array<string> | string | symbol}
   * @prop method
   *

  /**
   * Returns `true` if an entity with the provided identifier can be resolved using this resolver.
   * @param {string} id - fully qualified identifier.
   * @returns {boolean}
   */
  supports(id) {
    ensureString(id);
    const methods = [].concat(this.method);
    const prefixes = [].concat(this.prefix);

    return (
      (methods.includes(WILDCARD)
        || methods.includes(this.extractMethod(id)))
      && (prefixes.includes(WILDCARD) || prefixes.includes(this.extractPrefix(id)))
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
  extractPrefix(id) {
    ensureString(id);
    const end = id.indexOf(':');

    // eslint-disable-next-line no-bitwise
    return ~end ? id.slice(0, end) : '';
  }

  /**
   * Extracts a method from the provided identifier.
   *
   * @param {string} id
   * @returns {string}
   */
  extractMethod(id) {
    ensureString(id);
    const start = id.indexOf(':');
    const end = id.indexOf(':', start + 1);

    // eslint-disable-next-line no-bitwise
    return ~start && ~end ? id.slice(start + 1, end) : '';
  }
}

/**
 * Resolves an entity if its identifier is supported.
 * Each resolver must have static `string` or `WILDCARD` symbol properties `prefix` and `METHOD`,
 * then the `supports` method will return `true` if they match the identifier.
 * In case the resolver must be used for any `prefix`/`METHOD` as default, use the `WILDCARD` symbol.
 */
export default Resolver;
